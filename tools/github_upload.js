/**
 * Zero-Git GitHub Direct Repository Creator & Uploader
 * Uses native HTTPS and GitHub REST API to upload the entire codebase.
 * Usage: node tools/github_upload.js <GITHUB_PERSONAL_ACCESS_TOKEN> [repo_name]
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const token = process.argv[2];
const repoName = process.argv[3] || 'destiny-duel';

if (!token) {
  console.log('用法: node tools/github_upload.js <你的GitHub_Token> [仓库名]');
  console.log('获取 Token 地址: https://github.com/settings/tokens (勾选 repo 权限)');
  process.exit(1);
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error([] ));
          }
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

const headers = {
  'Authorization': Bearer ,
  'User-Agent': 'DestinyDuel-Uploader',
  'Accept': 'application/vnd.github+json'
};

async function main() {
  console.log([1/4] 正在验证 GitHub Token 并检查仓库  ...);
  const user = await request({
    hostname: 'api.github.com',
    path: '/user',
    method: 'GET',
    headers
  });
  console.log(  ✓ 成功登录 GitHub 用户: );

  let repo;
  try {
    repo = await request({
      hostname: 'api.github.com',
      path: /repos//,
      method: 'GET',
      headers
    });
    console.log(  ✓ 找到已存在的仓库: );
  } catch (e) {
    console.log(  + 正在自动创建新仓库:  ...);
    repo = await request({
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' }
    }, {
      name: repoName,
      description: '宿命对决 Destiny Duel - 1v1 卡牌对战系统 (云端部署版)',
      private: false,
      auto_init: true
    });
    console.log(  ✓ 仓库创建成功: );
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log([2/4] 正在扫描项目文件 ...);
  const root = path.resolve(__dirname, '..');
  const ignore = new Set(['.git', 'node_modules', 'destiny_duel_cloud.zip', '.DS_Store', 'Thumbs.db']);
  
  function scan(dir, base = '') {
    let files = [];
    for (const item of fs.readdirSync(dir)) {
      if (ignore.has(item) || item.endsWith('.log')) continue;
      const full = path.join(dir, item);
      const rel = base ? ${base}/ : item;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(scan(full, rel));
      } else if (stat.isFile()) {
        files.push({ full, rel, size: stat.size });
      }
    }
    return files;
  }

  const allFiles = scan(root);
  console.log(  ✓ 扫描到  个文件待上传。);

  console.log([3/4] 正在上传文件至 GitHub Git 数据库 ...);
  const treeItems = [];
  let count = 0;

  for (const f of allFiles) {
    count++;
    process.stdout.write(\r  上传进度: [/] );
    const content = fs.readFileSync(f.full);
    const isBinary = content.includes(0);
    const blob = await request({
      hostname: 'api.github.com',
      path: /repos///git/blobs,
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' }
    }, {
      content: content.toString(isBinary ? 'base64' : 'utf8'),
      encoding: isBinary ? 'base64' : 'utf-8'
    });

    treeItems.push({
      path: f.rel,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
  }
  console.log(\n  ✓ 所有文件 Blob 已成功存储到 GitHub！);

  console.log([4/4] 正在提交 Commit 并更新 main 分支 ...);
  // Get latest commit on main
  const ref = await request({
    hostname: 'api.github.com',
    path: /repos///git/ref/heads/main,
    method: 'GET',
    headers
  });
  const parentCommitSha = ref.object.sha;

  // Create tree
  const tree = await request({
    hostname: 'api.github.com',
    path: /repos///git/trees,
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  }, {
    tree: treeItems
  });

  // Create commit
  const newCommit = await request({
    hostname: 'api.github.com',
    path: /repos///git/commits,
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  }, {
    message: 'Deploy: Destiny Duel cloud deployment ready with Docker & WebSocket support',
    tree: tree.sha,
    parents: [parentCommitSha]
  });

  // Update ref
  await request({
    hostname: 'api.github.com',
    path: /repos///git/refs/heads/main,
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' }
  }, {
    sha: newCommit.sha,
    force: true
  });

  console.log(\n================================================================);
  console.log(🎉 恭喜！项目已完整上传至 GitHub！);
  console.log(👉 仓库地址: );
  console.log(👉 接下来在 Render.com 导入此仓库即可一键上线！);
  console.log(================================================================\n);
}

main().catch(err => {
  console.error('\n❌ 上传失败:', err.message);
  process.exit(1);
});
