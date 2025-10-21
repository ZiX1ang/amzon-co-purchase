import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, List, Spin, Alert, Button, Space, Tooltip, Badge, Slider, Row, Col } from 'antd';
import {
    ShoppingOutlined,
    LinkOutlined,
    ClusterOutlined,
    ReloadOutlined,
    EyeOutlined,
    StarOutlined,
    HighlightOutlined,
    ArrowRightOutlined,
    CloseOutlined,
    FilterOutlined
} from '@ant-design/icons';
import { GROUP_COLORS } from '../../utils/constants';
import './NodeDetail.css';

// 模拟邻居数据函数
const mockNeighbors = (nodeId, allNodes, allLinks) => {
    if (!nodeId || !allNodes || !allLinks) return [];

    const neighborIds = new Set();
    allLinks.forEach(link => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;

        if (sourceId === nodeId) {
            neighborIds.add(targetId);
        }
        if (targetId === nodeId) {
            neighborIds.add(sourceId);
        }
    });

    return allNodes.filter(node => neighborIds.has(node.id));
};

const NodeDetail = ({
                        node,
                        onViewNeighborDetail,
                        onViewAllRelated,
                        onClearHighlight,
                        onClose,
                        isUsingMockData = false,
                        networkData,
                        highlightedNodes = []
                    }) => {
    const [neighbors, setNeighbors] = useState([]);
    const [filteredNeighbors, setFilteredNeighbors] = useState([]);
    const [isLoadingNeighbors, setIsLoadingNeighbors] = useState(false);
    const [error, setError] = useState(null);
    const [degreeThreshold, setDegreeThreshold] = useState(1);
    const [maxDisplayCount, setMaxDisplayCount] = useState(10);

    // 加载邻居节点
    useEffect(() => {
        if (!node) {
            setNeighbors([]);
            setFilteredNeighbors([]);
            return;
        }

        const loadNeighbors = async () => {
            setIsLoadingNeighbors(true);
            setError(null);
            try {
                if (isUsingMockData) {
                    // 使用模拟邻居数据
                    const mockNeighborsData = mockNeighbors(node.id, networkData?.nodes, networkData?.links);
                    setNeighbors(mockNeighborsData);
                } else {
                    const { networkAPI } = await import('../../services/api');
                    const response = await networkAPI.getNeighbors(node.id);
                    setNeighbors(response.data);
                }
            } catch (err) {
                console.error('加载邻居节点失败:', err);
                setError('无法加载相关商品数据');
                // 即使出错也尝试使用模拟数据
                const mockNeighborsData = mockNeighbors(node.id, networkData?.nodes, networkData?.links);
                setNeighbors(mockNeighborsData);
            } finally {
                setIsLoadingNeighbors(false);
            }
        };

        loadNeighbors();
    }, [node, isUsingMockData, networkData]);

    // 过滤邻居节点
    useEffect(() => {
        if (!neighbors.length) {
            setFilteredNeighbors([]);
            return;
        }

        const filtered = neighbors
            .filter(neighbor => neighbor.degree >= degreeThreshold)
            .sort((a, b) => b.degree - a.degree)
            .slice(0, maxDisplayCount);

        setFilteredNeighbors(filtered);
    }, [neighbors, degreeThreshold, maxDisplayCount]);

    // 处理查看单个邻居详情
    const handleViewNeighborDetail = (neighbor) => {
        onViewNeighborDetail(neighbor);
    };

    // 处理高亮单个邻居
    const handleHighlightNeighbor = (neighborId, e) => {
        e.stopPropagation();
        onViewAllRelated([neighborId]);
    };

    // 处理查看全部相关商品
    const handleViewAllNeighbors = () => {
        const neighborIds = neighbors.map(n => n.id);
        onViewAllRelated(neighborIds);
    };

    // 处理高亮筛选后的邻居
    const handleHighlightFilteredNeighbors = () => {
        const neighborIds = filteredNeighbors.map(n => n.id);
        onViewAllRelated(neighborIds);
    };

    // 检查邻居是否被高亮
    const isNeighborHighlighted = (neighborId) => {
        return highlightedNodes.includes(neighborId);
    };

    // 检查当前节点是否被高亮
    const isCurrentNodeHighlighted = () => {
        return node && highlightedNodes.includes(node.id);
    };

    // 获取邻居节点的连接信息
    const getNeighborConnectionInfo = (neighborId) => {
        if (!networkData?.links) return '';

        const connections = networkData.links.filter(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return (sourceId === node.id && targetId === neighborId) ||
                (sourceId === neighborId && targetId === node.id);
        });

        return connections.length > 0 ? `${connections.length} 个共购关系` : '';
    };

    // 重置筛选条件
    const resetFilters = () => {
        setDegreeThreshold(1);
        setMaxDisplayCount(10);
    };

    if (!node) {
        return (
            <Card title="商品详情" className="node-detail-card">
                <div className="node-detail-empty">
                    <ClusterOutlined className="empty-icon" />
                    <div>请选择一个商品查看详情</div>
                    <div className="empty-tip">点击图中的节点或搜索商品来查看详情</div>
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <ShoppingOutlined />
                    商品详情
                    {highlightedNodes.length > 0 && (
                        <Badge
                            count={highlightedNodes.length}
                            size="small"
                            style={{ backgroundColor: '#52c41a' }}
                            title={`${highlightedNodes.length} 个高亮节点`}
                        />
                    )}
                    {isCurrentNodeHighlighted() && (
                        <span style={{ color: '#52c41a', fontSize: '12px' }}>• 已高亮</span>
                    )}
                </Space>
            }
            extra={
                <Space>
                    <Tooltip title="清除所有高亮">
                        <Button
                            icon={<ReloadOutlined />}
                            size="small"
                            onClick={onClearHighlight}
                            disabled={highlightedNodes.length === 0}
                        >
                            清除高亮
                        </Button>
                    </Tooltip>
                    <Tooltip title="关闭详情">
                        <Button
                            icon={<CloseOutlined />}
                            size="small"
                            onClick={onClose}
                        >
                            关闭
                        </Button>
                    </Tooltip>
                </Space>
            }
            className="node-detail-card"
        >
            <Descriptions
                column={1}
                bordered
                size="small"
                className="node-info"
            >
                <Descriptions.Item label="商品ID">
                    <Tag color="blue">{node.id}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="ASIN编号">
                    <code className="asin-code">{node.asin}</code>
                </Descriptions.Item>
                <Descriptions.Item label="商品标题">
                    <div className="node-title">{node.title || '无标题信息'}</div>
                </Descriptions.Item>
                <Descriptions.Item label="商品类别">
                    <Tag color={GROUP_COLORS[node.group] || GROUP_COLORS.Default}>
                        {node.group}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="连接度">
                    <div className="degree-info">
                        <LinkOutlined />
                        <span>{node.degree} 个共购关系</span>
                    </div>
                </Descriptions.Item>
                <Descriptions.Item label="相关商品数量">
                    <div className="neighbors-count">
                        <ClusterOutlined />
                        <span>{neighbors.length} 个相关商品</span>
                        {filteredNeighbors.length < neighbors.length && (
                            <Tag color="orange" size="small" style={{ marginLeft: 8 }}>
                                显示 {filteredNeighbors.length} 个
                            </Tag>
                        )}
                    </div>
                </Descriptions.Item>
                <Descriptions.Item label="高亮状态">
                    <div className="highlight-status">
                        {isCurrentNodeHighlighted() ? (
                            <span style={{ color: '#52c41a' }}>
                                <HighlightOutlined /> 已高亮显示
                            </span>
                        ) : (
                            <span style={{ color: '#8c8c8c' }}>未高亮</span>
                        )}
                    </div>
                </Descriptions.Item>
            </Descriptions>
            <div className="node-actions">
                <Row gutter={8}>
                    <Col span={12}>
                        <Tooltip title={`高亮当前商品和所有 ${neighbors.length} 个相关商品`}>
                            <Button
                                type="primary"
                                icon={<HighlightOutlined />}
                                block
                                onClick={handleViewAllNeighbors}
                                disabled={neighbors.length === 0}
                                size="middle"
                            >
                                高亮全部
                            </Button>
                        </Tooltip>
                    </Col>
                    <Col span={12}>
                        <Tooltip title={`高亮当前商品和筛选后的 ${filteredNeighbors.length} 个相关商品`}>
                            <Button
                                type="default"
                                icon={<EyeOutlined />}
                                block
                                onClick={handleHighlightFilteredNeighbors}
                                disabled={filteredNeighbors.length === 0}
                                size="middle"
                            >
                                高亮筛选
                            </Button>
                        </Tooltip>
                    </Col>
                </Row>
            </div>
            <div className="neighbors-filter">
                <div className="filter-header">
                    <FilterOutlined />
                    <span>列表筛选</span>
                    {(degreeThreshold > 1 || maxDisplayCount < neighbors.length) && (
                        <Button
                            size="small"
                            type="link"
                            onClick={resetFilters}
                            style={{ marginLeft: 'auto' }}
                        >
                            重置
                        </Button>
                    )}
                </div>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                    <Col span={24}>
                        <div className="filter-item">
                            <div className="filter-label">节点度数 ≥ {degreeThreshold}</div>
                            <Slider
                                min={1}
                                max={20}
                                value={degreeThreshold}
                                onChange={setDegreeThreshold}
                                tooltip={{ formatter: value => `≥ ${value}` }}
                            />
                        </div>
                    </Col>
                    <Col span={24}>
                        <div className="filter-item">
                            <div className="filter-label">显示数量: {maxDisplayCount}</div>
                            <Slider
                                min={5}
                                max={Math.min(50, neighbors.length)}
                                step={5}
                                value={maxDisplayCount}
                                onChange={setMaxDisplayCount}
                                tooltip={{ formatter: value => `${value} 个` }}
                            />
                        </div>
                    </Col>
                </Row>
            </div>
            <div className="neighbors-section">
                <div className="neighbors-header">
                    <ClusterOutlined />
                    <span>相关商品列表</span>
                    <span className="neighbors-count-badge">{filteredNeighbors.length}</span>
                    {filteredNeighbors.length < neighbors.length && (
                        <Tooltip title={`已筛选显示 ${filteredNeighbors.length} 个相关商品，共 ${neighbors.length} 个`}>
                            <Tag color="blue" size="small">已筛选</Tag>
                        </Tooltip>
                    )}
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="warning"
                        showIcon
                        size="small"
                        className="neighbors-error"
                    />
                )}

                {isLoadingNeighbors ? (
                    <div className="neighbors-loading">
                        <Spin size="small" />
                        <span>加载相关商品中...</span>
                    </div>
                ) : filteredNeighbors.length > 0 ? (
                    <List
                        size="small"
                        dataSource={filteredNeighbors}
                        renderItem={(neighbor) => (
                            <List.Item
                                className={`neighbor-item ${isNeighborHighlighted(neighbor.id) ? 'neighbor-highlighted' : ''}`}
                                onClick={() => handleViewNeighborDetail(neighbor)}
                                actions={[
                                    <Tooltip title="高亮此商品和当前商品">
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={(e) => handleHighlightNeighbor(neighbor.id, e)}
                                            style={{
                                                color: isNeighborHighlighted(neighbor.id) ? '#52c41a' : '#1890ff'
                                            }}
                                        >
                                            {isNeighborHighlighted(neighbor.id) ? '已高亮' : '高亮'}
                                        </Button>
                                    </Tooltip>,
                                    <Tooltip title="查看此商品详情">
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<ArrowRightOutlined />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewNeighborDetail(neighbor);
                                            }}
                                        >
                                            查看
                                        </Button>
                                    </Tooltip>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div
                                            className="neighbor-avatar"
                                            style={{ backgroundColor: GROUP_COLORS[neighbor.group] || GROUP_COLORS.Default }}
                                        >
                                            {neighbor.group.charAt(0)}
                                        </div>
                                    }
                                    title={
                                        <div className="neighbor-title">
                                            {neighbor.title || neighbor.asin}
                                            {isNeighborHighlighted(neighbor.id) && (
                                                <span className="highlight-indicator" title="当前已高亮">●</span>
                                            )}
                                        </div>
                                    }
                                    description={
                                        <div className="neighbor-meta">
                                            <Tag color={GROUP_COLORS[neighbor.group] || GROUP_COLORS.Default} size="small">
                                                {neighbor.group}
                                            </Tag>
                                            <span className="neighbor-degree">
                                                <StarOutlined /> {neighbor.degree} 连接
                                            </span>
                                            <span className="neighbor-connection">
                                                {getNeighborConnectionInfo(neighbor.id)}
                                            </span>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    <div className="neighbors-empty">
                        <ClusterOutlined />
                        <div>暂无相关商品数据</div>
                        <div className="empty-tip">
                            {neighbors.length > 0
                                ? '调整筛选条件以显示更多结果'
                                : '该商品没有与其他商品建立共购关系'
                            }
                        </div>
                    </div>
                )}
            </div>

        </Card>
    );
};

export default NodeDetail;