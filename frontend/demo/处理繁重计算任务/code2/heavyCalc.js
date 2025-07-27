function heavyCalculation() {
    console.log('开始大量计算...');
    const start = performance.now();
    
    let result = 0;
    // 进行一千万次计算
    for (let i = 0; i < 10000000; i++) {
        result += Math.sqrt(i) * Math.sin(i) * Math.cos(i) * Math.tan(i)
    }
    
    const end = performance.now();
    console.log(`计算完成，耗时: ${(end - start).toFixed(2)}ms`);
}

