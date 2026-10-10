export const PROVIDERS = Object.freeze({
  nace: { name: 'Nace', model: 'drex-v1.5', endpoint: 'https://console.nace.ai/v1/systemone', register: 'https://console.nace.ai/invite/7ccrty4b' },
  codiv: { name: 'Codiv', model: 'openjev-latest', endpoint: 'https://api.codiv.ai/v1/systemone' },
  typesafe: { name: 'TypeSafe', model: 'jev-1.13.0', endpoint: 'https://api.typesafe.ai/v1/systemone', register: 'https://console.typesafe.ai/keys', linkLabel: '获取 API Key' },
  openrouter: { name: 'OpenRouter', model: 'typesafe/jev-1.13', endpoint: 'https://openrouter.ai/api/v1/systemone', register: 'https://openrouter.ai/settings/keys', linkLabel: '获取 API Key' },
});

export const CATEGORIES = Object.freeze({
  marketing: { title: '营销推广', description: '广告、付费群、课程与私域引流', question: 'Is the main purpose selling or funneling to a product, paid group, course, referral or private channel?', yes: 'Primarily sales, advertising or conversion, including disguised promotion.', no: 'Independent reviews, personal experiences or natural brand mentions. A link alone is not marketing.' },
  empty: { title: '空洞灌水', description: '缺少信息的口号、常识与套话', question: 'Does this post lack concrete facts, useful advice, original views, lived experience or entertainment value?', yes: 'Empty slogans, generic filler, repeated obvious facts without substance.', no: 'Specific information, experience, opinion, humor or normal everyday conversation.' },
  clickbait: { title: '夸张标题党', description: '夸大承诺、悬念与误导性标题', question: 'Does this post use misleading hype or withheld key information to get clicks without delivering the promised substance?', yes: 'Exaggerated promises, artificial mystery or a bait-and-switch.', no: 'Normal rhetoric or a strong opinion supported by specifics.' },
  bait: { title: '情绪钓鱼', description: '刻意制造愤怒、恐慌与群体对立', question: 'Is this post primarily provoking anger, fear or group conflict for attention rather than substantive discussion?', yes: 'Baseless outrage, deliberate provocation or manufactured conflict.', no: 'Evidence-based criticism, reasonable complaints or sincere discussion, including politics.' },
  engagement: { title: '互动诱导', description: '求赞、互关、评论口令与刷量', question: 'Is this post mainly asking for likes, follows, reposts or comment passwords without independent content value?', yes: 'Engagement farming or giveaways whose main purpose is metrics.', no: 'Sincere questions, meaningful discussions or useful event information.' },
  formulaic: { title: '机械套话', description: '模板化叙述与空泛成功学', question: 'Is this post dominated by interchangeable boilerplate and formulaic motivational writing with no distinctive substance?', yes: 'Generic repetitive templates that work for any subject.', no: 'Clear structured writing, technical tutorials, real opinions or necessary terminology.' },
  boring: { title: '主观无趣', description: '缺少新意与个人表达，实验性', question: 'For a reader seeking information and novelty, does this post have no interesting angle, personal character, useful content or entertainment?', yes: 'Bland filler with no meaningful expression or interest.', no: 'Personal, emotional, informative or entertaining expression valuable to some real audience.' },
});

export const USEFUL_QUESTION = {
  type: 'noul',
  instructions: 'Does this post have clear factual, practical, personal, conversational or entertainment value for some real readers?',
  criteria: { true: 'Specific information, independent insight, experience, humor or meaningful personal expression.', false: 'Pure spam, deceptive promises, advertising without substance or empty filler.' },
};

export const MODES = { collapse: '折叠', cover: '遮盖', dim: '淡化', mark: '标记' };
export const PROMPT_VERSION = 'quality-v3';
