const fs = require('fs').promises;
const axios = require('axios');

const getHeaders = (token) => ({
    'authority': 'app.kivanet.com',
    'accept': '*/*',
    'authorization': `Bearer ${token}`,
    'content-type': 'application/json',
    'referer': 'https://app.kivanet.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
});

async function getToken() {
    try {
        if (process.env.KIVA_TOKEN) return process.env.KIVA_TOKEN.trim();
        const token = await fs.readFile('token.txt', 'utf8');
        return token.trim();
    } catch (error) {
        console.error('❌ 无法加载 token，请确保 `token.txt` 文件存在，或者设置环境变量 `KIVA_TOKEN`。');
        process.exit(1);
    }
}

async function fetchData(url, token) {
    try {
        const response = await axios.get(url, { headers: getHeaders(token) });
        return response.data.object;
    } catch (error) {
        console.error(`❌ 请求失败: ${url}`);
        console.error('错误信息:', error.response?.data?.message || error.message);
        return null;
    }
}

async function getUserInfo(token) {
    return await fetchData('https://app.kivanet.com/api/user/getUserInfo', token);
}

async function getMyAccountInfo(token) {
    return await fetchData('https://app.kivanet.com/api/user/getMyAccountInfo', token);
}

async function getSignInfo(token) {
    return await fetchData('https://app.kivanet.com/api/user/getSignInfo', token);
}

function calculateMiningTime(signTime, nowTime) {
    let timeDiffSec = Math.floor((nowTime - signTime) / 1000);
    const hours = Math.floor(timeDiffSec / 3600);
    timeDiffSec %= 3600;
    const minutes = Math.floor(timeDiffSec / 60);
    const seconds = timeDiffSec % 60;
    
    return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
}

async function displayAccountInfo(token) {
    const [userInfo, accountInfo, signInfo] = await Promise.all([
        getUserInfo(token),
        getMyAccountInfo(token),
        getSignInfo(token)
    ]);

    if (userInfo) {
        console.log('=== KIVA AUTO BOT| AIRDROP INSIDERS ===');
        console.log('ID:', userInfo.id);
        console.log('邮箱:', userInfo.email);
        console.log('昵称:', userInfo.nickName);
        console.log('邀请码:', userInfo.inviteNum);
        console.log('头像:', userInfo.avatar);
        console.log('创建日期:', userInfo.createTime);
        console.log('邀请人数:', userInfo.inviteCount);
    }

    if (accountInfo && signInfo) {
        console.log('\n=== 挖矿状态 ===');
        const miningTime = calculateMiningTime(parseInt(signInfo.signTime), parseInt(signInfo.nowTime));
        console.log('挖矿时间:', miningTime);
        console.log('余额:', `${accountInfo.balance} Kiva`);
    }

    console.log('====================\n');
}

async function periodicUpdate(token) {
    while (true) {
        const accountInfo = await getMyAccountInfo(token);
        const signInfo = await getSignInfo(token);

        if (accountInfo && signInfo) {
            const miningTime = calculateMiningTime(parseInt(signInfo.signTime), parseInt(signInfo.nowTime));
            console.log('=== 每分钟更新 ===');
            console.log('挖矿时间:', miningTime);
            console.log('余额:', `${accountInfo.balance} Kiva`);
            console.log('========================\n');
        }

        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
}

async function runBot() {
    const token = await getToken();
    console.log('✅ Token 加载成功!');

    await displayAccountInfo(token);

    periodicUpdate(token);
}

runBot().catch(console.error);
