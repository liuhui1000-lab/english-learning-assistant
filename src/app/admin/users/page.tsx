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
import { UserPlus, Edit, Trash2, Key, Search, Shield, User } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  stats: {
    total_count: number;
    knowledge_points: any;
    difficulties: any;
    sources: any;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 创建用户表单状态
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'user',
  });

  // 编辑用户表单状态
  const [editForm, setEditForm] = useState({
    email: '',
    fullName: '',
    role: 'user',
    isActive: true,
  });

  // 重置密码表单状态
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      console.log('加载用户列表，参数:', params.toString());
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();

      console.log('用户列表响应:', data);

      if (data.success) {
        setUsers(data.data);
        console.log('加载了', data.data.length, '个用户');
      } else {
        console.error('加载用户列表失败:', data.error);
        console.error('详细错误:', data.message);
        alert(`加载失败：${data.error}\n\n详细信息：${data.message || '无'}`);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      alert('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  // 创建用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        setIsCreateDialogOpen(false);
        setCreateForm({ username: '', email: '', password: '', fullName: '', role: 'user' });
        loadUsers();
        alert('用户创建成功！');
      } else {
        alert(`创建失败：${data.error}`);
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      alert('创建用户失败');
    }
  };

  // 编辑用户
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (data.success) {
        setIsEditDialogOpen(false);
        loadUsers();
        alert('用户信息更新成功！');
      } else {
        alert(`更新失败：${data.error}`);
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新用户失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`确定要删除用户 ${username} 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        loadUsers();
        alert('用户删除成功！');
      } else {
        alert(`删除失败：${data.error}`);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败');
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }

    if (!selectedUser) return;

    try {
      console.log('准备重置用户密码:', selectedUser.username, selectedUser.id);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordForm.newPassword }),
      });

      const data = await response.json();
      console.log('重置密码响应:', data);

      if (data.success) {
        setIsResetPasswordDialogOpen(false);
        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
        alert('密码重置成功！');
      } else {
        console.error('重置密码失败:', data.error);
        console.error('详细错误:', data.message);
        alert(`重置失败：${data.error}\n\n详细信息：${data.message || '无'}`);
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      alert(`重置密码失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      fullName: user.full_name || '',
      role: user.role,
      isActive: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  // 打开重置密码对话框
  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsResetPasswordDialogOpen(true);
  };

  // 过滤用户
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">用户管理</h1>
            <p className="text-gray-600 mt-1">管理系统用户和权限</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                创建用户
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新用户</DialogTitle>
                <DialogDescription>填写用户信息创建新账户</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">姓名</Label>
                  <Input
                    id="fullName"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">角色</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value) => setCreateForm({ ...createForm, role: value as 'admin' | 'user' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  创建用户
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜索和过滤 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索用户名、邮箱或姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="角色筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有角色</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>共 {filteredUsers.length} 个用户</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>错题数</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <Shield className="w-3 h-3" />
                              管理员
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <User className="w-3 h-3" />
                              普通用户
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? '活跃' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.stats?.total_count || 0}
                        </TableCell>
                        <TableCell>
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString('zh-CN')
                            : '从未登录'}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openResetPasswordDialog(user)}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.id, user.username)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑用户对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>修改用户信息</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-email">邮箱</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-fullName">姓名</Label>
                <Input
                  id="edit-fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">角色</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as 'admin' | 'user' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit-isActive">账户激活</Label>
              </div>
              <Button type="submit" className="w-full">
                保存修改
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* 重置密码对话框 */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重置密码</DialogTitle>
              <DialogDescription>
                为用户 {selectedUser?.username} 重置密码
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">新密码</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={resetPasswordForm.newPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={resetPasswordForm.confirmPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">
                重置密码
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
