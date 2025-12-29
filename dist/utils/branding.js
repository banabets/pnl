"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APE_TIPS = exports.APE_BANNER = void 0;
exports.getRandomApeTip = getRandomApeTip;
exports.displayApeBanner = displayApeBanner;
exports.APE_BANNER = `
    🐒 APE OF THE HILL VOLUME BOT 🏔️
    
       🍌    /\\   /\\    🍌
          \\  /  \\_/  \\  /
           \\/   🐒   \\/
            \\        /
             \\  /\\  /
              \\/  \\/
               🏔️
               
    "Those who control the volume,
     control the hill!"
     
    Built by apes, for apes! 🦍
`;
exports.APE_TIPS = [
    "🦍 Smart apes always test in simulation mode first!",
    "🍌 Don't risk all your bananas on one trade!",
    "🏔️ Slow and steady wins the hill climb!",
    "🐒 Ape together strong - but trade responsibly!",
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