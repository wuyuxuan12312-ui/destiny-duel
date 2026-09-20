// Shared numeric helpers for the combat pipeline.
(function(root) {
    /**
     * C#'s Math.Round defaults to MidpointRounding.ToEven, and the ported Unity card values
     * were tuned against it. JS Math.round sends +.5 upward, which diverges on the Vulnerable
     * (x1.5) and Weak (x0.75) multipliers — e.g. 3 damage x1.5 is 4 in C# but 5 in JS.
     */
    function roundHalfToEven(value) {
        const n = Number(value);
        if (!isFinite(n)) return 0;
        const floored = Math.floor(n);
        const remainder = n - floored;
        if (Math.abs(remainder - 0.5) < 1e-9) {
            return floored % 2 === 0 ? floored : floored + 1;
        }
        return Math.round(n);
    }

    /** Scale a card stat by a level ladder, matching Unity's (int)Math.Round(value * mult). */
    function scaleByLevel(value, multiplier) {
        if (!value) return 0;
        return roundHalfToEven(Number(value) * multiplier);
    }

    const MathUtil = { roundHalfToEven, scaleByLevel };
    if (typeof module !== 'undefined' && module.exports) module.exports = MathUtil;
    root.MathUtil = MathUtil;
})(typeof window !== 'undefined' ? window : global);
