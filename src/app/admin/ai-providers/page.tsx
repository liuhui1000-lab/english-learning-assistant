'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Power, RefreshCw, CheckCircle, XCircle, CheckCircle2 } from 'lucide-react';

interface AIProvider {
  id: number;
  provider_name: string;
  model_name: string;
  api_key_masked: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Gemini (Google)', icon: '🔮' },
  { value: 'deepseek', label: 'DeepSeek', icon: '🤖' },
  { value: 'kimi', label: 'Kimi (月之暗面)', icon: '🌙' },
  { value: 'openai', label: 'OpenAI', icon: '🧠' },
  { value: 'minimax', label: 'MiniMax', icon: '⚡' },
  { value: 'claude', label: 'Claude (Anthropic)', icon: '🎭' },
  { value: 'zhipu', label: '智谱清言', icon: '🎓' },
];

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini (Google)',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (月之暗面)',
  openai: 'OpenAI',
  minimax: 'MiniMax',
  claude: 'Claude (Anthropic)',
  zhipu: '智谱清言',
};

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<number | null>(null);
  const [needsInit, setNeedsInit] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    provider_name: '',
    model_name: '',
    api_key: '',
    priority: 0,
  });

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ai-providers');
      const data = await response.json();

      if (data.success) {
        setProviders(data.data);
        setNeedsInit(false);
      } else {
        // 检查是否是表不存在错误
        if (response.status === 500 && (data.tableNotExists || data.error?.code === 'TABLE_NOT_FOUND')) {
          setNeedsInit(true);
        } else {
          toast.error('加载AI配置失败');
        }
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
      setNeedsInit(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    try {
      setInitializing(true);

      // 先尝试简化版（不使用触发器）
      const response = await fetch('/api/admin/init-ai-providers-simple', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('数据库表初始化成功');
        setNeedsInit(false);
        loadProviders();
      } else {
        toast.error(data.error?.message || '初始化失败');
      }
    } catch (error) {
      console.error('初始化失败:', error);
      toast.error('初始化失败');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleAdd = async () => {
    if (!formData.provider_name || !formData.model_name || !formData.api_key) {
      toast.error('请填写所有必填字段');
      return;
    }

    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowAddDialog(false);
        setFormData({ provider_name: '', model_name: '', api_key: '', priority: 0 });
        loadProviders();
      } else {
        // 检查是否是表不存在错误
        if (response.status === 500 && data.error?.code === 'TABLE_NOT_FOUND') {
          setNeedsInit(true);
          toast.error('数据库表不存在，请先初始化');
        } else {
          toast.error(data.error?.message || '创建失败');
        }
      }
    } catch (error) {
      console.error('创建AI配置失败:', error);
      toast.error('创建AI配置失败');
    }
  };

  const handleUpdate = async () => {
    if (!editingProvider) return;

    try {
      const response = await fetch(`/api/admin/ai-providers/${editingProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: formData.model_name || editingProvider.model_name,
          api_key: formData.api_key || undefined,
          priority: formData.priority !== undefined ? formData.priority : editingProvider.priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('更新成功');
        setShowEditDialog(false);
        setEditingProvider(null);
        setFormData({ provider_name: '', model_name: '', api_key: '', priority: 0 });
        loadProviders();
      } else {
        toast.error(data.error?.message || '更新失败');
      }
    } catch (error) {
      console.error('更新AI配置失败:', error);
      toast.error('更新AI配置失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个AI配置吗？')) return;

    try {
      const response = await fetch(`/api/admin/ai-providers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('删除成功');
        loadProviders();
      } else {
        toast.error(data.error?.message || '删除失败');
      }
    } catch (error) {
      console.error('删除AI配置失败:', error);
      toast.error('删除AI配置失败');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/ai-providers/${id}/activate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        loadProviders();
      } else {
        toast.error(data.error?.message || '激活失败');
      }
    } catch (error) {
      console.error('激活AI配置失败:', error);
      toast.error('激活AI配置失败');
    }
  };

  const handleTest = async (id: number) => {
    try {
      setTestingProviderId(id);
      console.log('[UI] 开始测试AI配置，ID:', id);

      const response = await fetch(`/api/admin/ai-providers/${id}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      console.log('[UI] 测试API返回（完整）:', JSON.stringify(data, null, 2));

      if (data.success && data.valid) {
        // 测试成功
        let successMessage = data.message || 'API连接成功';
        if (data.testType === 'api') {
          successMessage += ` (${data.duration}ms)`;
        }

        console.log('[UI] 测试成功，显示成功提示');
        toast.success(successMessage, {
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          description: data.responsePreview ? `响应预览: ${data.responsePreview}` : undefined,
          duration: 5000,
        });
      } else {
        // 测试失败
        console.log('[UI] 测试失败:', data);

        let errorMessage = data.message || '配置验证失败';

        // 根据错误类型显示更详细的错误信息
        if (data.testType === 'api') {
          const errorMessages: Record<string, string> = {
            AUTH_FAILED: 'API密钥无效或已过期',
            MODEL_NOT_FOUND: '模型名称不存在',
            RATE_LIMIT: 'API调用频率超限',
            INVALID_REQUEST: '请求参数错误',
            NETWORK_ERROR: '网络连接失败',
            TIMEOUT: '请求超时',
            CONNECTION_FAILED: '无法连接到服务器',
          };

          if (data.errorType && errorMessages[data.errorType]) {
            errorMessage = errorMessages[data.errorType];
          }

          if (data.statusCode) {
            errorMessage += ` (HTTP ${data.statusCode})`;
          }

          if (data.duration) {
            errorMessage += ` - ${data.duration}ms`;
          }

          if (data.errorMessage) {
            errorMessage += `\n详情: ${data.errorMessage}`;
          }
        } else if (data.errors) {
          errorMessage += '\n' + data.errors.join(', ');
        }

        toast.error(errorMessage, {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[UI] 测试AI配置失败:', error);
      toast.error('测试AI配置失败 - 网络或服务器错误', {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const openEditDialog = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider_name: provider.provider_name,
      model_name: provider.model_name,
      api_key: '',
      priority: provider.priority,
    });
    setShowEditDialog(true);
  };

  const activeCount = providers.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI服务配置</h1>
          <p className="text-sm text-gray-600 mt-1">
            管理多个AI服务提供商，支持Gemini、DeepSeek、Kimi等
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加配置
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">总配置数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">激活配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">未激活</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {providers.length - activeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 配置列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>AI配置列表</CardTitle>
              <CardDescription>
                管理所有AI服务提供商的配置信息
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadProviders}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : needsInit ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-lg font-semibold text-gray-700">
                数据库表未初始化
              </div>
              <div className="text-sm text-gray-500">
                需要创建ai_providers表才能管理AI配置
              </div>
              <Button
                onClick={handleInit}
                disabled={initializing}
                className="flex items-center gap-2 mx-auto"
              >
                {initializing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {initializing ? '初始化中...' : '初始化数据库表'}
              </Button>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无AI配置，点击"添加配置"开始
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AI服务商</TableHead>
                  <TableHead>模型名称</TableHead>
                  <TableHead>API密钥</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {PROVIDER_OPTIONS.find((p) => p.value === provider.provider_name)?.icon}
                        </span>
                        {PROVIDER_LABELS[provider.provider_name]}
                      </div>
                    </TableCell>
                    <TableCell>{provider.model_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {provider.api_key_masked}
                    </TableCell>
                    <TableCell>{provider.priority}</TableCell>
                    <TableCell>
                      <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                        {provider.is_active ? '已激活' : '未激活'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(provider.updated_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(provider.id)}
                          disabled={testingProviderId === provider.id}
                          className="flex items-center gap-1"
                        >
                          {testingProviderId === provider.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          测试
                        </Button>
                        {!provider.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(provider.id)}
                            className="flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" />
                            激活
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(provider)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          编辑
                        </Button>
                        {!provider.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(provider.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            删除
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

      {/* 添加配置对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加AI配置</DialogTitle>
            <DialogDescription>
              添加一个新的AI服务提供商配置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>AI服务商 *</Label>
              <Select
                value={formData.provider_name}
                onValueChange={(value) =>
                  setFormData({ ...formData, provider_name: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择AI服务商" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>模型名称 *</Label>
              <Input
                placeholder="例如: gemini-2.5-flash"
                value={formData.model_name}
                onChange={(e) =>
                  setFormData({ ...formData, model_name: e.target.value })
                }
              />
              <p className="text-xs text-gray-500">
                常见模型: gemini-2.5-flash, deepseek-chat, moonshot-v1-8k
              </p>
            </div>
            <div className="space-y-2">
              <Label>API密钥 *</Label>
              <Input
                type="password"
                placeholder="输入API密钥"
                value={formData.api_key}
                onChange={(e) =>
                  setFormData({ ...formData, api_key: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-gray-500">
                数字越小优先级越高（0最高）
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleAdd}>添加</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑配置对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑AI配置</DialogTitle>
            <DialogDescription>
              编辑AI服务提供商配置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>AI服务商</Label>
              <Input
                value={PROVIDER_LABELS[formData.provider_name]}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                placeholder="例如: gemini-2.5-flash"
                value={formData.model_name}
                onChange={(e) =>
                  setFormData({ ...formData, model_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>API密钥（留空则不修改）</Label>
              <Input
                type="password"
                placeholder="输入新的API密钥"
                value={formData.api_key}
                onChange={(e) =>
                  setFormData({ ...formData, api_key: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>更新</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
