/**
 * 向下兼容逻辑测试脚本（支持学期）
 * 用于验证学习内容适配器的核心逻辑
 */

// 测试年级学期映射
function testGradeSemesterCompatibility() {
  console.log('=== 测试年级学期向下兼容映射 ===\n');

  const GRADE_SEMESTER_COMPATIBILITY: Record<string, string[]> = {
    '6年级上学期': ['6年级上学期'],
    '6年级下学期': ['6年级上学期', '6年级下学期'],
    '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
    '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
    '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
    '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
    '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
    '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
  };

  const gradeSemesters = ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'];

  gradeSemesters.forEach(gradeSemester => {
    const accessible = GRADE_SEMESTER_COMPATIBILITY[gradeSemester];
    console.log(`学生年级学期: ${gradeSemester}`);
    console.log(`可访问年级学期: ${accessible.join(', ')}`);
    console.log(`总数: ${accessible.length}`);
    console.log('---');
  });
}

// 测试学习统计计算
function testLearningStats() {
  console.log('\n=== 测试学习统计计算（支持学期） ===\n');

  // 模拟词族数据
  const mockFamilies = [
    {
      id: 'wf-happy',
      baseWord: 'happy',
      grade: '8年级',
      semester: '下学期',
      words: [
        { word: 'happy', grade: '8年级', semester: '下学期' },
        { word: 'happiness', grade: '7年级', semester: '上学期' },
        { word: 'happily', grade: '6年级', semester: '下学期' },
        { word: 'unhappy', grade: '9年级', semester: '上学期' },
      ],
    },
    {
      id: 'wf-success',
      baseWord: 'success',
      grade: '7年级',
      semester: '上学期',
      words: [
        { word: 'success', grade: '7年级', semester: '上学期' },
        { word: 'successful', grade: '6年级', semester: '上学期' },
        { word: 'successfully', grade: '8年级', semester: '上学期' },
      ],
    },
  ];

  // 模拟不同年级学期的统计
  const gradeSemesters = ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'];

  const GRADE_SEMESTER_COMPATIBILITY: Record<string, string[]> = {
    '6年级上学期': ['6年级上学期'],
    '6年级下学期': ['6年级上学期', '6年级下学期'],
    '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
    '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
    '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
    '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
    '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
    '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
  };

  gradeSemesters.forEach(userGradeSemester => {
    const accessibleGradeSemesters = GRADE_SEMESTER_COMPATIBILITY[userGradeSemester];

    let totalWords = 0;
    let currentSemesterWords = 0;
    let reviewWords = 0;

    mockFamilies.forEach(family => {
      const accessibleWords = family.words.filter(w => {
        const wordGradeSemester = `${w.grade}${w.semester}`;
        return accessibleGradeSemesters.includes(wordGradeSemester);
      });

      accessibleWords.forEach(word => {
        const wordGradeSemester = `${word.grade}${word.semester}`;
        totalWords++;
        if (wordGradeSemester === userGradeSemester) {
          currentSemesterWords++;
        } else {
          reviewWords++;
        }
      });
    });

    console.log(`学生年级学期: ${userGradeSemester}`);
    console.log(`可访问年级学期: ${accessibleGradeSemesters.join(', ')}`);
    console.log(`总单词数: ${totalWords}`);
    console.log(`当前年级学期单词数（新学）: ${currentSemesterWords}`);
    console.log(`复习单词数: ${reviewWords}`);
    console.log('---');
  });
}

// 测试学习计划生成
function testLearningPlan() {
  console.log('\n=== 测试学习计划生成（支持学期） ===\n');

  // 模拟词族数据
  const mockFamilies = [
    { id: 'wf1', grade: '6年级', semester: '上学期' },
    { id: 'wf2', grade: '6年级', semester: '上学期' },
    { id: 'wf3', grade: '6年级', semester: '下学期' },
    { id: 'wf4', grade: '7年级', semester: '上学期' },
    { id: 'wf5', grade: '7年级', semester: '下学期' },
    { id: 'wf6', grade: '8年级', semester: '上学期' },
    { id: 'wf7', grade: '8年级', semester: '下学期' },
    { id: 'wf8', grade: '9年级', semester: '上学期' },
  ];

  const GRADE_SEMESTER_COMPATIBILITY: Record<string, string[]> = {
    '6年级上学期': ['6年级上学期'],
    '6年级下学期': ['6年级上学期', '6年级下学期'],
    '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
    '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
    '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
    '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
    '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
    '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
  };

  const gradeSemesters = ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'];

  gradeSemesters.forEach(userGradeSemester => {
    const accessibleGradeSemesters = GRADE_SEMESTER_COMPATIBILITY[userGradeSemester];

    const schedule: any[] = [];
    const recommendedFamilies: string[] = [];

    accessibleGradeSemesters.forEach(gradeSemester => {
      const parts = gradeSemester.match(/(\d+年级)(上学期|下学期)/);
      if (!parts) return;

      const grade = parts[1];
      const semester = parts[2];

      const gradeSemesterFamilies = mockFamilies.filter(f => f.grade === grade && f.semester === semester);
      recommendedFamilies.push(...gradeSemesterFamilies.map(f => f.id));

      schedule.push({
        phase: gradeSemester === userGradeSemester ? '新学内容' : '复习内容',
        gradeSemester,
        families: gradeSemesterFamilies.length,
        estimatedDays: Math.ceil(gradeSemesterFamilies.length / 3),
      });
    });

    console.log(`学生年级学期: ${userGradeSemester}`);
    schedule.forEach(phase => {
      console.log(`  ${phase.phase}: ${phase.gradeSemester} - ${phase.families}个词族 (${phase.estimatedDays}天)`);
    });
    console.log(`推荐词族总数: ${recommendedFamilies.length}`);
    console.log('---');
  });
}

// 运行所有测试
function runAllTests() {
  console.log('开始运行年级学期向下兼容逻辑测试...\n');
  console.log('='.repeat(60));

  testGradeSemesterCompatibility();
  testLearningStats();
  testLearningPlan();

  console.log('\n' + '='.repeat(60));
  console.log('测试完成！');
}

// 导出测试函数（如果在 Node.js 环境中运行）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testGradeSemesterCompatibility,
    testLearningStats,
    testLearningPlan,
    runAllTests,
  };
}

// 如果直接运行此文件
if (typeof window === 'undefined' && require.main === module) {
  runAllTests();
}
