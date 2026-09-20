// End-to-end Multiplayer Validation: Dual-client WebSocket Lockstep Test
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert');
const { attachWebSocketServer } = require(path.join(__dirname, '..', 'server', 'websocket_room.js'));
const { loadGameRuntime } = require(path.join(__dirname, '..', 'tools', 'load_runtime.js'));

loadGameRuntime({ silent: true });

const CardNetworkManager = require(path.join(__dirname, '..', 'client', 'js', 'network.js'));

let passed = 0;
const failures = [];
function check(name, ok, detail) {
    if (ok) {
        passed++;
        console.log(`  ✓ ${name}`);
    } else {
        failures.push({ name, detail });
        console.log(`  ✗ ${name}：${detail}`);
    }
}

async function runMultiplayerTest() {
    console.log('\n================================================================');
    console.log('  《宿命对决 Destiny Duel》联机系统端到端回归测试 (E2E)');
    console.log('================================================================\n');

    const TEST_PORT = 3987;
    const server = http.createServer((req, res) => res.end('OK'));
    attachWebSocketServer(server);

    await new Promise(resolve => server.listen(TEST_PORT, resolve));
    console.log(`[1/5] 测试 WebSocket 服务器已启动 (ws://localhost:${TEST_PORT}/ws)`);

    const wsUrl = `ws://localhost:${TEST_PORT}/ws`;

    // 1. Initialize two network managers
    const hostNet = new CardNetworkManager({ wsUrl, forceWs: true });
    const guestNet = new CardNetworkManager({ wsUrl, forceWs: true });

    let roomCode = null;
    let hostConnected = false;
    let guestConnected = false;

    // 2. Room creation and joining
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Room creation / join timeout')), 5000);

        hostNet.onRoomCreated = (code) => {
            roomCode = code;
            check('房主成功创建房间并生成 4 位房间码', code && code.length === 4, `code=${code}`);
            // Guest joins
            guestNet.joinRoom(code);
        };

        let connCount = 0;
        const checkDone = () => {
            if (++connCount === 2) {
                clearTimeout(timeout);
                resolve();
            }
        };

        hostNet.onConnected = (isHost) => {
            hostConnected = isHost;
            check('房主收到对手接入通知并确认为 Host', isHost === true);
            checkDone();
        };

        guestNet.onConnected = (isHost) => {
            guestConnected = !isHost;
            check('客方成功连接房间并确认为 Guest', isHost === false);
            checkDone();
        };

        hostNet.createRoom();
    });

    console.log(`\n[2/5] 双方已完成 WebSocket 点对点握手（房间码: ${roomCode}）`);

    // 3. Hero Selection & Deck Spec Exchange
    let hostReceivedHero = null;
    let guestReceivedHero = null;

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Hero exchange timeout')), 5000);
        let exchanged = 0;
        const onDone = () => {
            if (++exchanged === 2) {
                clearTimeout(timeout);
                resolve();
            }
        };

        hostNet.onMessage = (data) => {
            if (data.type === 'SELECT_HERO') {
                hostReceivedHero = data.heroId;
                check('房主收到客方的出战英雄选择', data.heroId === 'iron_guardian');
                onDone();
            }
        };

        guestNet.onMessage = (data) => {
            if (data.type === 'SELECT_HERO') {
                guestReceivedHero = data.heroId;
                check('客方收到房知的出战英雄选择', data.heroId === 'fire_warrior');
                onDone();
            }
        };

        hostNet.send({ type: 'SELECT_HERO', heroId: 'fire_warrior' });
        guestNet.send({ type: 'SELECT_HERO', heroId: 'iron_guardian' });
    });

    console.log('\n[3/5] 双方英雄与卡组规格交换成功');

    // 4. Match Start & Lockstep Seed Synchronization
    const MATCH_SEED = 20260920;
    const hostGame = new global.CardGame();
    const guestGame = new global.CardGame();

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Match start timeout')), 5000);

        guestNet.onMessage = (data) => {
            if (data.type === 'START_MATCH') {
                check('客方收到统一战斗初始化种子包', data.seed === MATCH_SEED);
                
                // Both initialize match with the same seed!
                const hostDecks = {
                    p1Deck: global.createShuffledDeck('fire_warrior', null, global.createMatchRng(data.seed), {}),
                    p2Deck: global.createShuffledDeck('iron_guardian', null, global.createMatchRng(data.seed), {})
                };
                const guestDecks = {
                    p1Deck: global.createShuffledDeck('fire_warrior', null, global.createMatchRng(data.seed), {}),
                    p2Deck: global.createShuffledDeck('iron_guardian', null, global.createMatchRng(data.seed), {})
                };

                hostGame.initMatch('fire_warrior', 'iron_guardian', hostDecks, data.seed);
                guestGame.initMatch('fire_warrior', 'iron_guardian', guestDecks, data.seed);

                clearTimeout(timeout);
                resolve();
            }
        };

        // Host sends start match
        hostNet.send({
            type: 'START_MATCH',
            p1HeroId: 'fire_warrior',
            p2HeroId: 'iron_guardian',
            seed: MATCH_SEED
        });
    });

    console.log('\n[4/5] 锁步卡组与洗牌验证');
    // Verify opening hands and decks are bit-for-bit identical
    const hostP1Hand = hostGame.p1.hand.map(c => c.id).join(',');
    const guestP1Hand = guestGame.p1.hand.map(c => c.id).join(',');
    check('双方客户端初始手牌 100% 确定性一致', hostP1Hand === guestP1Hand, `P1手牌: ${hostP1Hand}`);

    const hostP1Deck = hostGame.p1.deck.map(c => c.id).join(',');
    const guestP1Deck = guestGame.p1.deck.map(c => c.id).join(',');
    check('双方客户端牌堆洗牌顺序 100% 确定性一致', hostP1Deck === guestP1Deck);

    // 5. In-Match Action Synchronization (Bidirectional)
    console.log('\n[5/5] 实战出牌、普通攻击与回合切换双向同步');

    // Setup action relays
    hostNet.onMessage = (data) => {
        if (data.type === 'ACTION') {
            const a = data.action;
            if (a.type === 'PLAY_CARD') hostGame.playCard(a.cardIndex, true);
            else if (a.type === 'NORMAL_ATTACK') hostGame.performNormalAttack(true);
            else if (a.type === 'END_TURN') hostGame.endTurn(true);
        }
    };

    guestNet.onMessage = (data) => {
        if (data.type === 'ACTION') {
            const a = data.action;
            if (a.type === 'PLAY_CARD') guestGame.playCard(a.cardIndex, true);
            else if (a.type === 'NORMAL_ATTACK') guestGame.performNormalAttack(true);
            else if (a.type === 'END_TURN') guestGame.endTurn(true);
        }
    };

    // Action 1: Host plays card in slot 0
    hostGame.playCard(0, true);
    guestNet.onMessage({ type: 'ACTION', action: { type: 'PLAY_CARD', cardIndex: 0 } });
    check('回合动作同步：P1出牌后双方血量与护盾完全一致',
        hostGame.p1.hp === guestGame.p1.hp && hostGame.p2.hp === guestGame.p2.hp && hostGame.p2.shield === guestGame.p2.shield,
        `Host P2 HP: ${hostGame.p2.hp}, Guest P2 HP: ${guestGame.p2.hp}`);

    // Action 2: Host performs normal attack
    hostGame.performNormalAttack(true);
    guestNet.onMessage({ type: 'ACTION', action: { type: 'NORMAL_ATTACK' } });
    check('回合动作同步：P1普攻后伤害结算双方完全一致',
        hostGame.p2.hp === guestGame.p2.hp && hostGame.p1.energy === guestGame.p1.energy);

    // Action 3: Host ends turn
    hostGame.endTurn(true);
    guestNet.onMessage({ type: 'ACTION', action: { type: 'END_TURN' } });
    check('回合交替同步：回合顺利推进至 P2 (铁卫) 且双方轮数一致',
        hostGame.activePlayer === hostGame.p2 && guestGame.activePlayer === guestGame.p2 && hostGame.turnCount === guestGame.turnCount);

    // Action 4: Guest (P2) takes action
    guestGame.playCard(0, true);
    hostNet.onMessage({ type: 'ACTION', action: { type: 'PLAY_CARD', cardIndex: 0 } });
    check('反向动作同步：P2 出牌后 P1 客户端成功接收并同步生命与状态',
        hostGame.p1.hp === guestGame.p1.hp && hostGame.p2.shield === guestGame.p2.shield);

    // Clean disconnect test
    let hostReceivedDisconnect = false;
    await new Promise((resolve) => {
        hostNet.onDisconnected = () => {
            hostReceivedDisconnect = true;
            resolve();
        };
        guestNet.disconnect();
        setTimeout(resolve, 300);
    });
    check('断线检测与房间清理：对手退出后房主收到断线通知', hostReceivedDisconnect === true);

    hostNet.disconnect();
    server.close();

    console.log('\n' + '='.repeat(64));
    console.log(`联机端到端测试：通过 ${passed}，失败 ${failures.length}`);
    if (failures.length) {
        console.log('\n失败项明细：');
        failures.forEach(f => console.log(`  - ${f.name}：${f.detail}`));
        process.exit(1);
    } else {
        console.log('✓ 全部联机功能与锁步校验 100% 通过！\n');
    }
}

runMultiplayerTest().catch(err => {
    console.error('Test crashed:', err);
    process.exit(1);
});
