'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface LibraryVersion {
  id: number;
  library_type: string;
  version: string;
  description: string;
  is_active: boolean;
  created_at: string;
  created_by_name: string;
  item_count: number;
}

interface ImportTask {
  id: number;
  library_type: string;
  file_name: string;
  file_format: string;
  status: string;
  total_items: number;
  success_items: number;
  failed_items: number;
  created_at: string;
  duration_seconds: number | null;
  success_rate: number;
}

export default function LibraryManagementPage() {
  const [versions, setVersions] = useState<LibraryVersion[]>([]);
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateVersionDialogOpen, setIsCreateVersionDialogOpen] = useState(false);

  // 导入表单状态
  const [importForm, setImportForm] = useState({
    libraryType: 'word',
    version: '',
    description: '',
    file: null as File | null,
  });

  // 创建版本表单状态
  const [createVersionForm, setCreateVersionForm] = useState({
    libraryType: 'word',
    version: '',
    description: '',
  });

  // 加载数据
  const loadData = async () => {
    try {
      const [versionsRes, tasksRes] = await Promise.all([
        fetch('/api/admin/library/versions'),
        fetch('/api/admin/library/import/tasks'),
      ]);

      const versionsData = await versionsRes.json();
      const tasksData = await tasksRes.json();

      if (versionsData.success) setVersions(versionsData.data);
      if (tasksData.success) setImportTasks(tasksData.data);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每30秒刷新一次导入任务状态
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 导入题库
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!importForm.file) {
      alert('请选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', importForm.file);
    formData.append('libraryType', importForm.libraryType);
    formData.append('version', importForm.version);
    formData.append('description', importForm.description);

    try {
      const response = await fetch('/api/admin/library/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setIsImportDialogOpen(false);
        setImportForm({ libraryType: 'word', version: '', description: '', file: null });
        alert('导入任务已创建！');
        loadData();
      } else {
        alert(`导入失败：${data.error}`);
      }
    } catch (error) {
      alert('导入失败');
    }
  };

  // 创建版本
  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/library/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createVersionForm),
      });

      const data = await response.json();

      if (data.success) {
        setIsCreateVersionDialogOpen(false);
        setCreateVersionForm({ libraryType: 'word', version: '', description: '' });
        alert('版本创建成功！');
        loadData();
      } else {
        alert(`创建失败：${data.error}`);
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  // 激活版本
  const handleActivateVersion = async (versionId: number) => {
    if (!confirm('确定要激活此版本吗？')) return;

    try {
      const response = await fetch(`/api/admin/library/versions/${versionId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert('版本激活成功！');
        loadData();
      } else {
        alert(`激活失败：${data.error}`);
      }
    } catch (error) {
      alert('激活失败');
    }
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: number, version: string) => {
    if (!confirm(`确定要删除版本 ${version} 吗？此操作不可恢复。`)) return;

    try {
      const response = await fetch(`/api/admin/library/versions/${versionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('版本删除成功！');
        loadData();
      } else {
        alert(`删除失败：${data.error}`);
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  // 导出版本
  const handleExportVersion = async (versionId: number, libraryType: string, version: string) => {
    try {
      const response = await fetch(`/api/admin/library/versions/${versionId}/export`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${libraryType}-${version}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('导出失败');
      }
    } catch (error) {
      alert('导出失败');
    }
  };

  // 获取题库名称
  const getLibraryName = (type: string) => {
    const names: Record<string, string> = {
      word: '单词库',
      grammar: '语法题库',
      phrase: '固定搭配',
      reading: '阅读理解',
    };
    return names[type] || type;
  };

  // 获取任务状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取任务状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '等待中',
      processing: '处理中',
      success: '成功',
      failed: '失败',
    };
    return texts[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">题库管理</h1>
            <p className="text-gray-600 mt-1">管理单词、语法题、固定搭配等学习资料</p>
          </div>
        </div>

        <Tabs defaultValue="versions">
          <TabsList>
            <TabsTrigger value="versions">题库版本</TabsTrigger>
            <TabsTrigger value="import">导入记录</TabsTrigger>
          </TabsList>

          {/* 题库版本标签页 */}
          <TabsContent value="versions" className="space-y-6">
            {/* 操作栏 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        导入题库
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>导入题库</DialogTitle>
                        <DialogDescription>
                          支持 JSON 和 CSV 格式文件导入
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleImport} className="space-y-4">
                        <div>
                          <Label htmlFor="libraryType">题库类型</Label>
                          <Select
                            value={importForm.libraryType}
                            onValueChange={(value) => setImportForm({ ...importForm, libraryType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="word">单词库</SelectItem>
                              <SelectItem value="grammar">语法题库</SelectItem>
                              <SelectItem value="phrase">固定搭配</SelectItem>
                              <SelectItem value="reading">阅读理解</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="version">版本号</Label>
                          <Input
                            id="version"
                            placeholder="例如: 1.0.0"
                            value={importForm.version}
                            onChange={(e) => setImportForm({ ...importForm, version: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">版本描述</Label>
                          <Input
                            id="description"
                            placeholder="描述本次更新的内容"
                            value={importForm.description}
                            onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="file">选择文件</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".json,.csv"
                            onChange={(e) => setImportForm({ ...importForm, file: e.target.files?.[0] || null })}
                            required
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            支持 .json 和 .csv 格式
                          </p>
                        </div>
                        <Button type="submit" className="w-full">
                          开始导入
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isCreateVersionDialogOpen} onOpenChange={setIsCreateVersionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        创建版本
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>创建新版本</DialogTitle>
                        <DialogDescription>创建空的题库版本</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateVersion} className="space-y-4">
                        <div>
                          <Label htmlFor="createLibraryType">题库类型</Label>
                          <Select
                            value={createVersionForm.libraryType}
                            onValueChange={(value) => setCreateVersionForm({ ...createVersionForm, libraryType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="word">单词库</SelectItem>
                              <SelectItem value="grammar">语法题库</SelectItem>
                              <SelectItem value="phrase">固定搭配</SelectItem>
                              <SelectItem value="reading">阅读理解</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="createVersion">版本号</Label>
                          <Input
                            id="createVersion"
                            placeholder="例如: 1.0.0"
                            value={createVersionForm.version}
                            onChange={(e) => setCreateVersionForm({ ...createVersionForm, version: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="createDescription">版本描述</Label>
                          <Input
                            id="createDescription"
                            placeholder="描述此版本"
                            value={createVersionForm.description}
                            onChange={(e) => setCreateVersionForm({ ...createVersionForm, description: e.target.value })}
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          创建版本
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    刷新
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 版本列表 */}
            <Card>
              <CardHeader>
                <CardTitle>题库版本列表</CardTitle>
                <CardDescription>共 {versions.length} 个版本</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>题库</TableHead>
                        <TableHead>版本</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>题目数量</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>创建者</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map((version) => (
                        <TableRow key={version.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-600" />
                              {getLibraryName(version.library_type)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{version.version}</TableCell>
                          <TableCell className="text-gray-500">{version.description || '-'}</TableCell>
                          <TableCell>{version.item_count}</TableCell>
                          <TableCell>
                            {version.is_active ? (
                              <Badge variant="default" className="bg-green-500">已激活</Badge>
                            ) : (
                              <Badge variant="secondary">未激活</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(version.created_at).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell>{version.created_by_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!version.is_active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleActivateVersion(version.id)}
                                  title="激活版本"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExportVersion(version.id, version.library_type, version.version)}
                                title="导出版本"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {!version.is_active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteVersion(version.id, version.version)}
                                  title="删除版本"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 导入记录标签页 */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>导入记录</CardTitle>
                <CardDescription>共 {importTasks.length} 条记录</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>题库</TableHead>
                        <TableHead>文件</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>导入进度</TableHead>
                        <TableHead>成功率</TableHead>
                        <TableHead>时长</TableHead>
                        <TableHead>创建时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="text-gray-500">#{task.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-600" />
                              {getLibraryName(task.library_type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {task.file_format === 'json' ? (
                                <FileJson className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                              )}
                              {task.file_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span>{getStatusText(task.status)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.total_items > 0 ? (
                              <span className="text-sm">
                                成功 {task.success_items} / 失败 {task.failed_items} / 总计 {task.total_items}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.success_rate > 0 ? (
                              <Badge
                                variant={task.success_rate === 100 ? 'default' : 'secondary'}
                              >
                                {task.success_rate}%
                              </Badge>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.duration_seconds ? (
                              <span className="text-sm">
                                {Math.floor(task.duration_seconds)}秒
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(task.created_at).toLocaleString('zh-CN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
