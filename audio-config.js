/*
  茹茹生日网站 · V13 音频 + 视频配置
  不懂代码也可以操作：只替换双引号内的内容，保留双引号和逗号。
  留空 "" = 使用网站自带的文件路径：
    背景音乐：assets/ruru-happy-birthday-instrumental.mp3
    语音：assets/audio/01.mpeg ... 14.mpeg（本版按你提供的 MPEG 扩展名预设）
    视频：assets/video/birthday-gesture-dance.mp4
  也可以填可以直接播放的 HTTPS 音视频文件直链（不是网页分享链接）。
  注意：如果你说的 MPEG 音频文件扩展名实际是 .mp3，请把 voiceExtension 改成 "mp3"。
  MPEG 的具体编码决定浏览器能否播放；部分 .mpeg 文件可能需要转成 MP3。
*/
window.RURU_AUDIO_LINKS = {
  bgm: "",  // 背景音乐（留空就是现有 Happy Birthday 轻音乐）
  voiceExtension: "mp3", // 14 个本地录音的扩展名；如文件名是 .mp3 就写 "mp3"
  video: "", // 视频链接；留空就加载 assets/video/birthday-gesture-dance.mp4
  voices: {
    "01": "", // 生日快乐呀亲爱的
    "02": "", // 晚安噢，好梦
    "03": "", // 愛你噢
    "04": "", // 不要想太多，一切都会好起来的。
    "05": "", // 有没有好好吃饭啊
    "06": "", // 今天辛苦啦我的宝
    "07": "", // 好想你呀
    "08": "", // 好喜欢你呀
    "09": "", // 你什么时候才肯回头呀
    "10": "", // 要不要做我女朋友呀
    "11": "", // 好好愛自己啊
    "12": "", // 奇奇
    "13": "", // 茹茹
    "14": "", // 亲爱的
  }
};
