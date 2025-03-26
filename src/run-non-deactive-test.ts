import { amaciBenchmarkRoundsSyncExecuteNoDeactive } from './amaci-test-round-sync-non-deactive';

// 测试配置
const testConfigs = {
    "small": { rounds: 1, voters: 25, period: 20, title: "小规模测试-无注销", deactivate: false },
    "medium": { rounds: 1, voters: 50, period: 30, title: "中规模测试-无注销", deactivate: false },
    "large": { rounds: 2, voters: 625, period: 2880, title: "4-2-2-25 only tally 625 voters", deactivate: false }
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
    console.log(`\n\n========== 开始执行无注销测试: ${testId} ==========\n`);
    await amaciBenchmarkRoundsSyncExecuteNoDeactive(
        config.rounds,
        config.voters,
        config.period,
        config.title,
    );
    console.log(`\n========== 测试完成: ${testId} ==========\n\n`);
}

main().catch(console.error); 