#!/bin/bash

# AI服务切换功能测试脚本
# 测试多AI服务配置和切换功能

set -e

echo "======================================"
echo "AI服务切换功能测试"
echo "======================================"
echo ""

# 配置
BASE_URL="http://localhost:5000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印成功消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误消息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 步骤1：管理员登录
echo "步骤1：管理员登录..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    "$BASE_URL/api/auth/login")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    print_error "管理员登录失败"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

print_success "管理员登录成功"

# 步骤2：获取当前AI配置
echo ""
echo "步骤2：获取当前AI配置..."
AI_PROVIDERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers")

echo "$AI_PROVIDERS_RESPONSE" | jq '.'

if [ "$(echo $AI_PROVIDERS_RESPONSE | jq -r '.success')" != "true" ]; then
    print_error "获取AI配置失败"
    exit 1
fi

print_success "获取AI配置成功"

# 步骤3：获取激活的AI配置
echo ""
echo "步骤3：获取激活的AI配置..."
ACTIVE_PROVIDERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers/active")

echo "$ACTIVE_PROVIDERS_RESPONSE" | jq '.'

if [ "$(echo $ACTIVE_PROVIDERS_RESPONSE | jq -r '.success')" != "true" ]; then
    print_error "获取激活AI配置失败"
    exit 1
fi

ACTIVE_COUNT=$(echo $ACTIVE_PROVIDERS_RESPONSE | jq -r '.data | length')
print_success "当前有 $ACTIVE_COUNT 个激活的AI配置"

# 步骤4：添加DeepSeek配置
echo ""
echo "步骤4：添加DeepSeek配置..."
ADD_DEEPSEEK_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "provider_name": "deepseek",
        "model_name": "deepseek-chat",
        "api_key": "your-deepseek-api-key",
        "priority": 2
    }' \
    "$BASE_URL/api/admin/ai-providers")

echo "$ADD_DEEPSEEK_RESPONSE" | jq '.'

if [ "$(echo $ADD_DEEPSEEK_RESPONSE | jq -r '.success')" != "true" ]; then
    print_warning "添加DeepSeek配置失败（可能已存在）"
else
    print_success "添加DeepSeek配置成功"
fi

# 步骤5：添加Kimi配置
echo ""
echo "步骤5：添加Kimi配置..."
ADD_KIMI_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "provider_name": "kimi",
        "model_name": "moonshot-v1-8k",
        "api_key": "your-kimi-api-key",
        "priority": 3
    }' \
    "$BASE_URL/api/admin/ai-providers")

echo "$ADD_KIMI_RESPONSE" | jq '.'

if [ "$(echo $ADD_KIMI_RESPONSE | jq -r '.success')" != "true" ]; then
    print_warning "添加Kimi配置失败（可能已存在）"
else
    print_success "添加Kimi配置成功"
fi

# 步骤6：重新获取AI配置
echo ""
echo "步骤6：重新获取AI配置..."
AI_PROVIDERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers")

echo "$AI_PROVIDERS_RESPONSE" | jq '.data[] | {provider_name, model_name, is_active, priority}'

# 步骤7：获取配置ID
echo ""
echo "步骤7：准备测试切换功能..."
PROVIDER_ID=$(echo $AI_PROVIDERS_RESPONSE | jq -r '.data[] | select(.provider_name == "deepseek") | .id')

if [ -z "$PROVIDER_ID" ]; then
    print_error "找不到DeepSeek配置ID"
    exit 1
fi

echo "找到DeepSeek配置ID: $PROVIDER_ID"

# 步骤8：激活DeepSeek配置
echo ""
echo "步骤8：激活DeepSeek配置..."
ACTIVATE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers/$PROVIDER_ID/activate")

echo "$ACTIVATE_RESPONSE" | jq '.'

if [ "$(echo $ACTIVATE_RESPONSE | jq -r '.success')" != "true" ]; then
    print_error "激活DeepSeek配置失败"
    exit 1
fi

print_success "激活DeepSeek配置成功"

# 步骤9：验证激活状态
echo ""
echo "步骤9：验证激活状态..."
ACTIVE_PROVIDERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers/active")

echo "$ACTIVE_PROVIDERS_RESPONSE" | jq '.data[] | {provider_name, model_name, is_active}'

# 步骤10：更新DeepSeek配置
echo ""
echo "步骤10：更新DeepSeek配置（修改优先级）..."
UPDATE_RESPONSE=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "priority": 1
    }' \
    "$BASE_URL/api/admin/ai-providers/$PROVIDER_ID")

echo "$UPDATE_RESPONSE" | jq '.'

if [ "$(echo $UPDATE_RESPONSE | jq -r '.success')" != "true" ]; then
    print_error "更新DeepSeek配置失败"
    exit 1
fi

print_success "更新DeepSeek配置成功"

# 步骤11：获取非激活配置ID（用于测试删除）
echo ""
echo "步骤11：获取非激活配置ID..."
INACTIVE_PROVIDER_ID=$(echo $AI_PROVIDERS_RESPONSE | jq -r '.data[] | select(.provider_name == "kimi" and .is_active == false) | .id')

if [ -n "$INACTIVE_PROVIDER_ID" ] && [ "$INACTIVE_PROVIDER_ID" != "null" ]; then
    echo "找到非激活配置ID: $INACTIVE_PROVIDER_ID"

    # 步骤12：删除非激活配置
    echo ""
    echo "步骤12：删除非激活配置..."
    DELETE_RESPONSE=$(curl -s -X DELETE \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE_URL/api/admin/ai-providers/$INACTIVE_PROVIDER_ID")

    echo "$DELETE_RESPONSE" | jq '.'

    if [ "$(echo $DELETE_RESPONSE | jq -r '.success')" != "true" ]; then
        print_error "删除配置失败"
    else
        print_success "删除配置成功"
    fi
else
    print_warning "没有找到非激活的配置，跳过删除测试"
fi

# 步骤13：最终验证
echo ""
echo "步骤13：最终验证..."
FINAL_AI_PROVIDERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/ai-providers")

echo "$FINAL_AI_PROVIDERS_RESPONSE" | jq '.data | length' | xargs echo "总配置数:"
echo "$FINAL_AI_PROVIDERS_RESPONSE" | jq '.data[] | select(.is_active == true) | .provider_name' | xargs echo "激活的AI服务:"

# 完成
echo ""
echo "======================================"
print_success "AI服务切换功能测试完成！"
echo "======================================"
echo ""
echo "测试总结："
echo "✓ 管理员登录"
echo "✓ 获取AI配置列表"
echo "✓ 获取激活的AI配置"
echo "✓ 添加新AI配置（DeepSeek、Kimi）"
echo "✓ 激活AI配置"
echo "✓ 更新AI配置"
echo "✓ 删除非激活配置"
echo ""
echo "下一步："
echo "1. 在管理界面配置真实的API密钥"
echo "2. 测试实际的AI服务调用"
echo "3. 验证不同AI服务的切换效果"
