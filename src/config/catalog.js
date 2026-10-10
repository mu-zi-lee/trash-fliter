export const PROVIDERS = Object.freeze({
  nace: { name: 'Nace', model: 'drex-v1.5', endpoint: 'https://console.nace.ai/v1/systemone', register: 'https://console.nace.ai/invite/7ccrty4b' },
  codiv: { name: 'Codiv', model: 'openjev-latest', endpoint: 'https://api.codiv.ai/v1/systemone' },
  typesafe: { name: 'TypeSafe', model: 'jev-1.13.0', endpoint: 'https://api.typesafe.ai/v1/systemone', register: 'https://console.typesafe.ai/keys', linkLabel: '获取 API Key' },
  openrouter: { name: 'OpenRouter', model: 'typesafe/jev-1.13', endpoint: 'https://openrouter.ai/api/v1/systemone', register: 'https://openrouter.ai/settings/keys', linkLabel: '获取 API Key' },
});

export const CATEGORIES = Object.freeze({
  marketing: { title: '营销推广', description: '广告、付费群、课程与私域引流', question: 'Does the supplied text primarily solicit a purchase, paid membership, referral conversion or private-channel lead?', yes: 'An explicit sales offer, commission/referral solicitation, paid-course pitch or contact/join call-to-action serving promotion.', no: 'Independent reviews, personal experiences, free resources, reporting, natural brand mentions or a link alone. Mentioning a price or recommending a tool alone is insufficient.' },
  empty: { title: '空洞灌水', description: '缺少信息的口号、常识与套话', question: 'Does this post lack concrete facts, useful advice, original views, lived experience or entertainment value?', yes: 'Empty slogans, generic filler, repeated obvious facts without substance.', no: 'Specific information, experience, opinion, humor or normal everyday conversation.' },
  clickbait: { title: '夸张标题党', description: '夸大承诺、悬念与误导性标题', question: 'Does the visible text mainly attract clicks through exaggerated promises or manufactured mystery?', yes: 'Easy-money or guaranteed-transformation claims, sensational overstatements, secret/revelation hooks withholding key facts, or bait-and-switch. Visible wording can establish these patterns without seeing the body.', no: 'Straightforward headlines, specific questions, concrete personal accounts, useful summaries or recognizable jokes. Ordinary curiosity or a strong opinion alone is insufficient.' },
  bait: { title: '情绪钓鱼', description: '刻意制造愤怒、恐慌与群体对立', question: 'Is the visible text mainly an outrage, fear or group-conflict hook rather than a substantive point?', yes: 'Sweeping group contempt, inflammatory us-versus-them claims, manufactured panic, or accusations framed chiefly to provoke reactions. Explicit harassment language is not required.', no: 'Specific criticism, personal frustration, disagreement, satire or sincere concerns. Negative sentiment alone is insufficient.' },
  engagement: { title: '互动诱导', description: '求赞、互关、评论口令与刷量', question: 'Is this post mainly asking for likes, follows, reposts or comment passwords without independent content value?', yes: 'Engagement farming or giveaways whose main purpose is metrics.', no: 'Sincere questions, meaningful discussions or useful event information.' },
  formulaic: { title: '机械套话', description: '模板化叙述与空泛成功学', question: 'Is this post dominated by interchangeable boilerplate and formulaic motivational writing with no distinctive substance?', yes: 'Generic repetitive templates that work for any subject.', no: 'Clear structured writing, technical tutorials, real opinions or necessary terminology.' },
  boring: { title: '主观无趣', description: '缺少新意与个人表达，实验性', question: 'For a reader seeking information and novelty, does this post have no interesting angle, personal character, useful content or entertainment?', yes: 'Bland filler with no meaningful expression or interest.', no: 'Personal, emotional, informative or entertaining expression valuable to some real audience.' },
});

export const USEFUL_QUESTION = {
  type: 'noul',
  instructions: 'Does this post have clear factual, practical, personal, conversational or entertainment value for some real readers?',
  criteria: { true: 'Substantial specific information, actionable steps, independent insight, firsthand detail or original humor that remains valuable after removing the promotional hook. Value must be in the visible text.', false: 'An appealing topic, promised benefit, generic encouragement, minor factual detail, call to action, or guessed value in an unseen body. These do not rescue spam, deceptive promises or filler.' },
};

export const MODES = { collapse: '折叠', cover: '遮盖', dim: '淡化', mark: '标记' };
export const PROMPT_VERSION = 'quality-v5-visible-patterns';
