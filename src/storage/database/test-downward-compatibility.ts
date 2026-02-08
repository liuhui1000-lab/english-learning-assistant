/**
 * 向下兼容逻辑测试脚本
 * 用于验证学习内容适配器的核心逻辑
 */

// 测试年级映射
function testGradeCompatibility() {
  console.log('=== 测试年级向下兼容映射 ===\n');

  const GRADE_COMPATIBILITY: Record<string, string[]> = {
    '6年级': ['6年级'],
    '7年级': ['6年级', '7年级'],
    '8年级': ['6年级', '7年级', '8年级'],
    '9年级': ['6年级', '7年级', '8年级', '9年级'],
  };

  const grades = ['6年级', '7年级', '8年级', '9年级'];

  grades.forEach(grade => {
    const accessible = GRADE_COMPATIBILITY[grade];
    console.log(`学生年级: ${grade}`);
    console.log(`可访问年级: ${accessible.join(', ')}`);
    console.log(`总年级数: ${accessible.length}`);
    console.log('---');
  });
}

// 测试学习统计计算
function testLearningStats() {
  console.log('\n=== 测试学习统计计算 ===\n');

  // 模拟词族数据
  const mockFamilies = [
    {
      id: 'wf-happy',
      baseWord: 'happy',
      grade: '8年级',
      words: [
        { word: 'happy', grade: '8年级' },
        { word: 'happiness', grade: '7年级' },
        { word: 'happily', grade: '6年级' },
        { word: 'unhappy', grade: '9年级' },
      ],
    },
    {
      id: 'wf-success',
      baseWord: 'success',
      grade: '7年级',
      words: [
        { word: 'success', grade: '7年级' },
        { word: 'successful', grade: '6年级' },
        { word: 'successfully', grade: '8年级' },
      ],
    },
  ];

  // 模拟不同年级的统计
  const grades = ['6年级', '7年级', '8年级', '9年级'];

  const GRADE_COMPATIBILITY: Record<string, string[]> = {
    '6年级': ['6年级'],
    '7年级': ['6年级', '7年级'],
    '8年级': ['6年级', '7年级', '8年级'],
    '9年级': ['6年级', '7年级', '8年级', '9年级'],
  };

  grades.forEach(userGrade => {
    const accessibleGrades = GRADE_COMPATIBILITY[userGrade];

    let totalWords = 0;
    let currentGradeWords = 0;
    let reviewWords = 0;

    mockFamilies.forEach(family => {
      const accessibleWords = family.words.filter(w =>
        accessibleGrades.includes(w.grade)
      );

      accessibleWords.forEach(word => {
        totalWords++;
        if (word.grade === userGrade) {
          currentGradeWords++;
        } else {
          reviewWords++;
        }
      });
    });

    console.log(`学生年级: ${userGrade}`);
    console.log(`可访问年级: ${accessibleGrades.join(', ')}`);
    console.log(`总单词数: ${totalWords}`);
    console.log(`当前年级单词数（新学）: ${currentGradeWords}`);
    console.log(`复习单词数: ${reviewWords}`);
    console.log('---');
  });
}

// 测试学习计划生成
function testLearningPlan() {
  console.log('\n=== 测试学习计划生成 ===\n');

  // 模拟词族数据
  const mockFamilies = [
    { id: 'wf1', grade: '6年级' },
    { id: 'wf2', grade: '6年级' },
    { id: 'wf3', grade: '6年级' },
    { id: 'wf4', grade: '7年级' },
    { id: 'wf5', grade: '7年级' },
    { id: 'wf6', grade: '8年级' },
    { id: 'wf7', grade: '8年级' },
    { id: 'wf8', grade: '9年级' },
  ];

  const GRADE_COMPATIBILITY: Record<string, string[]> = {
    '6年级': ['6年级'],
    '7年级': ['6年级', '7年级'],
    '8年级': ['6年级', '7年级', '8年级'],
    '9年级': ['6年级', '7年级', '8年级', '9年级'],
  };

  const grades = ['6年级', '7年级', '8年级', '9年级'];

  grades.forEach(userGrade => {
    const accessibleGrades = GRADE_COMPATIBILITY[userGrade];

    const schedule: any[] = [];
    const recommendedFamilies: string[] = [];

    accessibleGrades.forEach(grade => {
      const gradeFamilies = mockFamilies.filter(f => f.grade === grade);
      recommendedFamilies.push(...gradeFamilies.map(f => f.id));

      schedule.push({
        phase: grade === userGrade ? '新学内容' : '复习内容',
        grade,
        families: gradeFamilies.length,
        estimatedDays: Math.ceil(gradeFamilies.length / 3),
      });
    });

    console.log(`学生年级: ${userGrade}`);
    schedule.forEach(phase => {
      console.log(`  ${phase.phase}: ${phase.grade} - ${phase.families}个词族 (${phase.estimatedDays}天)`);
    });
    console.log(`推荐词族总数: ${recommendedFamilies.length}`);
    console.log('---');
  });
}

// 运行所有测试
function runAllTests() {
  console.log('开始运行向下兼容逻辑测试...\n');
  console.log('='.repeat(50));

  testGradeCompatibility();
  testLearningStats();
  testLearningPlan();

  console.log('\n' + '='.repeat(50));
  console.log('测试完成！');
}

// 导出测试函数（如果在 Node.js 环境中运行）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testGradeCompatibility,
    testLearningStats,
    testLearningPlan,
    runAllTests,
  };
}

// 如果直接运行此文件
if (typeof window === 'undefined' && require.main === module) {
  runAllTests();
}
