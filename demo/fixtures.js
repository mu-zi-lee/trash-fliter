export const POSTS = [
  { id: '10001', handle: 'fieldnotes', name: '林间笔记', avatar: '林', text: '今天给阳台的番茄换了更大的盆。试了两种土，保水性差异比想象中大。记录一下：泥炭与珍珠岩 3:1，浇透后称重，三天后再称一次，看看失水速度。' },
  { id: '10002', handle: 'growthclub', name: '增长俱乐部', avatar: 'G', text: '普通人翻身的机会来了！每天十分钟，轻松打造被动收入。这套方法已经帮助无数人改变人生，评论「资料」免费领取，错过今天你一定会后悔。' },
  { id: '10003', handle: 'slowbuild', name: '慢慢构建', avatar: '慢', text: '上周写了一个小工具整理浏览器书签。最意外的发现是，把重复网址合并比分类本身更有用。附上实现思路：先规范化 URL，再按域名分组，最后手动确认标题。' },
  { id: '10004', handle: 'dailyhype', name: '每日热榜', avatar: 'D', text: '惊天内幕！99% 的人都不知道的秘密，这件事将颠覆你的认知。先点赞再收藏，下一条告诉你答案！别问，问就是懂的都懂。' },
  { id: '10005', handle: 'camerauser', name: '随手拍', avatar: '拍', text: '这周借了朋友的相机，傍晚在江边试拍。与手机相比，逆光时的高光保留明显更好，但自动对焦在夜间也会犹豫。下面是同一位置的参数记录：35mm，f/2.8，1/250s，ISO 800。' },
  { id: '10006', handle: 'friendlyad', name: '小店日记', avatar: '小', text: '分享一下店里的手冲咖啡方法：15g 豆子配 240g 水，水温 92 度，先注水 30g 闷蒸 30 秒，后面分两段注水。也欢迎来店里尝尝，新豆子这周到货。' },
];

export function createArticle(post) {
  const article = document.createElement('article');
  article.dataset.testid = 'tweet';
  article.innerHTML = `<div class="post-head"><div class="avatar"></div><div><div class="author"></div><span class="handle"></span></div><a href="/${post.handle}/status/${post.id}"><time>2 小时</time></a></div><p data-testid="tweetText"></p><div class="post-actions"><span data-icon="message"></span><span data-icon="repost"></span><span data-icon="heart"></span></div>`;
  article.querySelector('.avatar').textContent = post.avatar;
  article.querySelector('.author').textContent = post.name;
  article.querySelector('.handle').textContent = `@${post.handle}`;
  article.querySelector('[data-testid="tweetText"]').textContent = post.text;
  return article;
}
