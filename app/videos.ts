// BibleProject videos, matched to the places where their story happens.
//
// Acts is a book of journeys, and BibleProject covers it as four narratives —
// Pentecost, then Acts 8-12, 13-20 and 21-28. Those are stories of specific
// places, not surveys, which is why they qualify where a book overview would
// not: an overview of Acts is no more a video about Philippi than an overview
// of Mark is a video about Gadara. The two "Book of Acts Summary" overviews are
// deliberately absent for that reason.
//
// A place earns a video when its own passage sits inside that video's span AND
// something actually happens there. That second half does most of the work.
// Amphipolis and Apollonia are "they passed through" (17:1); Samothrace and
// Neapolis are one verse of sailing (16:11); Syracuse and Rhegium are ports the
// ship touched on the way north. None of them get one. Twenty-five of the
// sixty-three places do.
//
// The labels name the span — 使徒行传 13–20, not just a title — so a reader can
// see they are getting the leg of the journey rather than a film about that one
// town.
//
// Every id is checked against YouTube's oEmbed endpoint by
// scripts/check-videos.mjs, which fails if one stops resolving or stops
// belonging to the BibleProject channel. Do not add an id by hand without
// running it — a wrong eleven characters is a silently broken embed.
//
// BibleProject is not affiliated with this map; the videos are embedded and
// credited, never rehosted.

export type Video = {
  /** YouTube id. */
  id: string;
  /** Our label, in the panel's voice. */
  title: string;
  /** The video's own title on YouTube, verbatim. */
  source: string;
};

export const videos = {
  pentecost: { id: 'JQhkWmFJKnA', title: '五旬节那一天 · 使徒行传 2', source: "What Happened at Pentecost and Why It's Important" },
  acts812: { id: 'oiVAbkINtRU', title: '福音走出犹太 · 使徒行传 8–12', source: 'The Apostle Paul: Acts 8-12' },
  journeys: { id: 'fglsbcGSr3A', title: '保罗的宣教旅程 · 使徒行传 13–20', source: "Paul's Missionary Journeys: Acts 13-20" },
  rome2128: { id: 'FJsiwOB0Pvg', title: '押解赴罗马 · 使徒行传 21–28', source: 'Bound for Rome: Acts 21-28' },
} satisfies Record<string, Video>;

export type VideoKey = keyof typeof videos;

/**
 * Which video belongs to which place, with the passage that earns it — the same
 * reference the gazetteer entry carries, so the pairing can be checked rather
 * than trusted.
 */
export const placeVideo: Record<string, VideoKey> = {
  jerusalem: 'pentecost',           // 2:1–41 — 影片讲的就是这一天

  // ——— 使徒行传 8–12 ———
  samaria: 'acts812',               // 8:4–25  腓利下撒马利亚
  gaza: 'acts812',                  // 8:26–39 埃塞俄比亚太监
  damascus: 'acts812',              // 9:1–25  扫罗归主
  lydda: 'acts812',                 // 9:32–35 以尼雅起来
  joppa: 'acts812',                 // 9:36–43；10:9–23 大比大与屋顶异象
  caesarea: 'acts812',              // 10:1–48 哥尼流一家受洗
  'antioch-syria': 'acts812',       // 11:19–26 门徒第一次被称为基督徒

  // ——— 使徒行传 13–20 ———
  paphos: 'journeys',               // 13:6–12  方伯士求保罗信道
  'antioch-pisidia': 'journeys',    // 13:14–52 会堂里最长的一篇道
  iconium: 'journeys',              // 14:1–7
  lystra: 'journeys',               // 14:8–20  医好瘸腿的人，又被石头打
  derbe: 'journeys',                // 14:20–23 门徒众多，原路折返
  troas: 'journeys',                // 16:8–11  马其顿的异象
  philippi: 'journeys',             // 16:12–40 吕底亚与狱中的歌
  thessalonica: 'journeys',         // 17:1–9   「搅乱天下的」
  berea: 'journeys',                // 17:10–14 天天查考圣经
  athens: 'journeys',               // 17:16–34 亚略巴古的讲论
  corinth: 'journeys',              // 18:1–18  住了一年零六个月
  ephesus: 'journeys',              // 19:1–41  银匠的暴动
  miletus: 'journeys',              // 20:15–38 与以弗所长老诀别

  // ——— 使徒行传 21–28 ———
  tyre: 'rome2128',                 // 21:3–6   沙滩上的送别
  'fair-havens': 'rome2128',        // 27:8–12  被否决的忠告
  malta: 'rome2128',                // 27:39–28:11 船破人存
  rome: 'rome2128',                 // 28:16–31 放胆传讲，无人禁止
};
