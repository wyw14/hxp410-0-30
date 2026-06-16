const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41130;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const CHALLENGES_FILE = path.join(DATA_DIR, 'challenges.json');

const challengePool = [
  { type: 'apology', icon: '🕊️', prompt: '写一句你一直想说却没说出口的道歉', hint: '可以写给某个具体的人，也可以写给曾经的自己' },
  { type: 'gratitude', icon: '🌸', prompt: '写一句感谢，给一个你平时忽略的人或事', hint: '可以是身边人，也可以是某个平凡的瞬间' },
  { type: 'letgo', icon: '🍂', prompt: '写下一件你想放下的事，然后轻轻放手', hint: '不需要解释原因，只需要承认它存在过' },
  { type: 'apology', icon: '💬', prompt: '对自己说一句对不起，为那些你对自己不够温柔的时刻', hint: '我们常常忘记，自己也需要被原谅' },
  { type: 'gratitude', icon: '☀️', prompt: '感谢今天的自己，哪怕只是坚持了一件小事', hint: '微小的坚持也值得被看见' },
  { type: 'letgo', icon: '🌊', prompt: '写下一个你不再需要的执念，让它随风而去', hint: '执念不是错，但放下也是一种勇敢' },
  { type: 'apology', icon: '🙏', prompt: '为一次沉默道歉——那些你选择沉默但本该开口的时刻', hint: '沉默有时也是一种遗憾' },
  { type: 'gratitude', icon: '💛', prompt: '写一句感谢，给一个你不常表达感激的人', hint: '那些习以为常的陪伴，最容易被忽略' },
  { type: 'letgo', icon: '🍃', prompt: '写一句告别的话，给一段已经过去的回忆', hint: '告别不是遗忘，而是带着温柔继续前行' },
  { type: 'gratitude', icon: '🌈', prompt: '感谢一个让你成长的困难时刻', hint: '那些艰难的日子，也是塑造你的力量' },
  { type: 'apology', icon: '🌱', prompt: '为一次急躁道歉，写给被你情绪伤到的人', hint: '情绪不是错，但伤人的话可以被收回' },
  { type: 'letgo', icon: '🌙', prompt: '放下一个对他人的期待，写一句释然的话', hint: '期待不是爱，接受本来的样子才是' },
  { type: 'gratitude', icon: '🍀', prompt: '感谢身体为你做的一切，哪怕你常常忽略它', hint: '每一次呼吸，每一次心跳，都值得感恩' },
  { type: 'apology', icon: '🪞', prompt: '对镜子里的自己说一句抱歉，为那些自我否定的时刻', hint: '你值得被自己温柔对待' },
  { type: 'letgo', icon: '✨', prompt: '写下一个比较的念头，然后告诉自己：你已经足够好', hint: '比较是偷走快乐的小偷' },
  { type: 'gratitude', icon: '🌺', prompt: '写一句感谢，给今天遇到的某个善意', hint: '陌生人的微笑，也是值得珍惜的温暖' },
  { type: 'apology', icon: '💌', prompt: '为一次拖延道歉，写给因此被影响的自己或他人', hint: '拖延背后往往有不安，理解它，然后道歉' },
  { type: 'letgo', icon: '🦋', prompt: '写下一个「我必须」的信念，然后允许自己不完美', hint: '「我必须」是一道锁，「我选择」才是自由' },
  { type: 'gratitude', icon: '🎵', prompt: '感谢一首歌、一本书或一部电影，它曾陪你度过难关', hint: '那些艺术带来的慰藉，也是真实的陪伴' },
  { type: 'letgo', icon: '🎈', prompt: '写下一个人对你的评价，然后告诉自己：那不是全部的你', hint: '别人的评价只是他们的视角，不是你的定义' },
  { type: 'apology', icon: '🤝', prompt: '为一次没有认真倾听道歉', hint: '认真倾听是稀有的礼物' },
  { type: 'gratitude', icon: '🌻', prompt: '感谢一次失败，它教会了你什么', hint: '失败不是终点，是另一扇门的开始' },
  { type: 'letgo', icon: '🪶', prompt: '写下一个担忧，然后告诉自己：未来会自己到来', hint: '担忧是预支的痛苦，现在只需一步' },
  { type: 'gratitude', icon: '💝', prompt: '写一句感谢，给一个已经离开你生活的人', hint: '有些人虽然离开了，但他们给过的温暖仍在' },
  { type: 'apology', icon: '🧸', prompt: '为没有好好照顾自己道歉', hint: '照顾自己不是自私，是必要的温柔' },
  { type: 'letgo', icon: '🌿', prompt: '放下对完美的追求，写一句接受不完美的话', hint: '完美是幻影，真实才是力量' },
  { type: 'gratitude', icon: '⭐', prompt: '感谢今天的一个小确幸', hint: '一杯热茶、一阵微风，生活藏在细节里' },
  { type: 'apology', icon: '🪷', prompt: '为一次逃避道歉，写给那个你选择回避的时刻', hint: '逃避是人之常情，承认它需要勇气' },
  { type: 'letgo', icon: '🗝️', prompt: '写下一件你反复纠结的事，然后选择不再纠结', hint: '纠结是在原地打转，放手才能前行' },
  { type: 'gratitude', icon: '🧡', prompt: '感谢此刻正在做这个练习的自己', hint: '愿意面对内心，本身就是一种勇敢' },
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(CHALLENGES_FILE)) {
  fs.writeFileSync(CHALLENGES_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readChallenges() {
  const data = fs.readFileSync(CHALLENGES_FILE, 'utf8');
  return JSON.parse(data);
}

function writeChallenges(challenges) {
  fs.writeFileSync(CHALLENGES_FILE, JSON.stringify(challenges, null, 2));
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTodayChallenge() {
  const today = getTodayDateString();
  const seed = today.split('-').join('');
  const index = (parseInt(seed, 10) % challengePool.length);
  return { ...challengePool[index], date: today };
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/challenge/today', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const challenge = getTodayChallenge();
    const challenges = readChallenges();
    const todayRecord = challenges.find(c => c.userId === userId && c.date === challenge.date);
    res.json({
      challenge: {
        date: challenge.date,
        type: challenge.type,
        icon: challenge.icon,
        prompt: challenge.prompt,
        hint: challenge.hint
      },
      completed: !!todayRecord,
      response: todayRecord ? todayRecord.response : null
    });
  } catch (error) {
    console.error('获取今日挑战时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/challenges', (req, res) => {
  try {
    const { userId, response } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    if (!response || !response.trim()) {
      return res.status(400).json({ error: '回应内容不能为空' });
    }

    if (response.length > 500) {
      return res.status(400).json({ error: '回应内容不能超过500字' });
    }

    const challenge = getTodayChallenge();
    const challenges = readChallenges();
    const existingIndex = challenges.findIndex(c => c.userId === userId && c.date === challenge.date);

    const record = {
      id: existingIndex >= 0 ? challenges[existingIndex].id : uuidv4(),
      userId: userId,
      date: challenge.date,
      type: challenge.type,
      icon: challenge.icon,
      prompt: challenge.prompt,
      hint: challenge.hint,
      response: response.trim(),
      createdAt: existingIndex >= 0 ? challenges[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      challenges[existingIndex] = record;
    } else {
      challenges.push(record);
    }

    writeChallenges(challenges);

    res.json({
      success: true,
      message: '你的回应已私密保存',
      record
    });
  } catch (error) {
    console.error('保存挑战回应时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/challenges', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const challenges = readChallenges();
    const userChallenges = challenges.filter(c => c.userId === userId);
    const sorted = [...userChallenges].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
      challenges: sorted,
      total: sorted.length
    });
  } catch (error) {
    console.error('获取挑战记录时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
