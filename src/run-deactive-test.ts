import { amaciBenchmarkRoundsSyncExecute } from './amaci-test-round-sync-deactive';

// 测试配置
const testConfigs = {
    "small": { rounds: 1, voters: 25, period: 70, title: "小规模测试-有注销", deactivate: true },
    "medium": { rounds: 1, voters: 50, period: 30, title: "中规模测试-有注销", deactivate: true },
    "large": { rounds: 1, voters: 625, period: 2880, title: "4-2-2-25 only deactive 625 voters", deactivate: true }
};

async function main() {
    const args = process.argv.slice(2);
    const testId = args[0] || "small";
    
    if (!testConfigs[testId]) {
        console.error(`未知的测试ID: ${testId}`);
        console.error(`可用的测试ID: ${Object.keys(testConfigs).join(", ")}`);
        return;
    }
    
    const config = testConfigs[testId];
    console.log(`\n\n========== 开始执行有注销测试: ${testId} ==========\n`);
    await amaciBenchmarkRoundsSyncExecute(
        config.rounds,
        config.voters,
        config.period,
        config.title,
    );
    console.log(`\n========== 测试完成: ${testId} ==========\n\n`);
}

main().catch(console.error); 