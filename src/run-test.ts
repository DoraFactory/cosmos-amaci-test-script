import { amaciBenchmarkRoundsSyncExecute as executeWithDeactive } from './amaci-test-round-sync-deactive';
import { amaciBenchmarkRoundsSyncExecuteNoDeactive as executeWithoutDeactive } from './amaci-test-round-sync-non-deactive';

// 根据环境变量选择执行函数
const isDeactivate = process.env.DEACTIVATE === 'true';
const execute = isDeactivate ? executeWithDeactive : executeWithoutDeactive;

// 测试配置
const testConfigs = {
    "small": { rounds: 1, voters: 25, period: 20, title: `小规模测试-${isDeactivate ? '有' : '无'}注销`, deactivate: isDeactivate },
    "medium": { rounds: 1, voters: 50, period: 30, title: `中规模测试-${isDeactivate ? '有' : '无'}注销`, deactivate: isDeactivate },
    "large": { rounds: 2, voters: 100, period: 40, title: `大规模测试-${isDeactivate ? '有' : '无'}注销`, deactivate: isDeactivate }
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
    console.log(`\n\n========== 开始执行${isDeactivate ? '有' : '无'}注销测试: ${testId} ==========\n`);
    await execute(
        config.rounds,
        config.voters,
        config.period,
        config.title,
    );
    console.log(`\n========== 测试完成: ${testId} ==========\n\n`);
}

main().catch(console.error); 