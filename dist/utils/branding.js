"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APE_TIPS = exports.APE_BANNER = void 0;
exports.getRandomApeTip = getRandomApeTip;
exports.displayApeBanner = displayApeBanner;
exports.APE_BANNER = `
    💰 PNL - Profit & Loss Trading Bot 💰
    
       📈    /\\   /\\    📈
          \\  /  \\_/  \\  /
           \\/   💰   \\/
            \\        /
             \\  /\\  /
              \\/  \\/
               📊
               
    "Track your profits,
     minimize your losses!"
     
    Built for traders, by traders! 🚀
`;
exports.APE_TIPS = [
    "📊 Always test in simulation mode first!",
    "💰 Don't risk more than you can afford to lose!",
    "📈 Slow and steady wins the trading race!",
    "🎯 Trade responsibly and manage your risk!",
    "🌙 Diamond hands, but paper losses hurt less!",
    "🚀 To the moon, but keep feet on the ground!",
    "💎 HODL the good trades, cut the bad ones!",
    "🎯 Volume is king, but risk management is emperor!",
];
function getRandomApeTip() {
    return exports.APE_TIPS[Math.floor(Math.random() * exports.APE_TIPS.length)];
}
function displayApeBanner() {
    console.log(exports.APE_BANNER);
}
//# sourceMappingURL=branding.js.map