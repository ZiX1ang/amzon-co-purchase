import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Spin, Alert, message } from 'antd';
import {
    ShoppingOutlined,
    DashboardOutlined
} from '@ant-design/icons';
import NetworkGraph from './components/NetworkGraph/NetworkGraph';
import StatisticsPanel from './components/StatisticsPanel/StatisticsPanel';
import SearchPanel from './components/SearchPanel/SearchPanel';
import NodeDetail from './components/NodeDetail/NodeDetail';
import { networkAPI } from './services/api';
import './App.css';

const { Header, Sider, Content } = Layout;

const mockData = {
};

function App() {
    const [networkData, setNetworkData] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [groups, setGroups] = useState([]);
    const [popularNodes, setPopularNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [highlightedNodes, setHighlightedNodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUsingMockData, setIsUsingMockData] = useState(false);

    // 初始化数据
    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        setIsLoading(true);
        setError(null);
        setIsUsingMockData(false);

        try {
            // 尝试从后端加载数据
            const [networkResponse, statsResponse, groupsResponse, popularResponse] =
                await Promise.all([
                    networkAPI.getFullNetwork(),
                    networkAPI.getStatistics(),
                    networkAPI.getGroups(),
                    networkAPI.getHighlyConnectedNodes(10)
                ]);

            setNetworkData(networkResponse.data);
            setStatistics(statsResponse.data);
            setGroups(groupsResponse.data);
            setPopularNodes(popularResponse.data);

            message.success('数据加载成功！');
        } catch (err) {
            // 使用模拟数据
            console.warn('后端连接失败，使用模拟数据:', err);
            setNetworkData(mockData.networkData);
            setStatistics(mockData.statistics);
            setGroups(mockData.groups);
            setPopularNodes(mockData.popularNodes);
            setIsUsingMockData(true);
            message.warning('使用模拟数据演示，部分功能可能受限');
        } finally {
            setIsLoading(false);
        }
    };

    // 获取邻居节点ID的函数
    const getNeighborIds = (nodeId, links) => {
        if (!nodeId || !links) return [];

        const neighborIds = new Set();
        links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;

            if (sourceId === nodeId) {
                neighborIds.add(targetId);
            }
            if (targetId === nodeId) {
                neighborIds.add(sourceId);
            }
        });
        return Array.from(neighborIds);
    };

    // 处理节点点击
    const handleNodeClick = (node) => {
        setSelectedNode(node);
        // 自动高亮直接邻居
        const neighborIds = getNeighborIds(node.id, networkData?.links);
        setHighlightedNodes([node.id, ...neighborIds]);
        message.info(`已选择: ${node.title || node.asin}`);
    };

    // 处理查看邻居商品详情
    const handleViewNeighborDetail = (neighborNode) => {
        setSelectedNode(neighborNode);
        // 高亮新选择的节点及其邻居
        const neighborIds = getNeighborIds(neighborNode.id, networkData?.links);
        setHighlightedNodes([neighborNode.id, ...neighborIds]);
        message.info(`已切换到: ${neighborNode.title || neighborNode.asin}`);
    };

    // 处理查看全部相关商品
    const handleViewAllRelated = (nodeIds) => {
        if (selectedNode) {
            // 确保包含当前节点和传入的节点
            const allRelatedNodes = [selectedNode.id, ...nodeIds];
            setHighlightedNodes(allRelatedNodes);
            message.success(`已高亮 ${nodeIds.length} 个相关商品`);
        }
    };

    // 清除高亮
    const handleClearHighlight = () => {
        setHighlightedNodes([]);
        message.info('已清除所有高亮');
    };

    // 处理组过滤
    const handleGroupFilter = (nodeIds) => {
        setHighlightedNodes(nodeIds || []);
        setSelectedNode(null);
    };

    // 处理查看全部节点
    const handleViewAllNodes = () => {
        setHighlightedNodes([]);
        message.info('显示所有节点');
    };

    const handleRetry = () => {
        initializeData();
    };

    if (isLoading) {
        return (
            <div className="app-loading">
                <Spin size="large" />
                <div className="loading-text">正在加载商品共购关系数据...</div>
            </div>
        );
    }

    return (
        <Layout className="app-layout">
            <Header className="app-header">
                <div className="header-content">
                    <div className="header-title">
                        <ShoppingOutlined className="header-icon" />
                        Amazon商品共购关系分析平台
                        {isUsingMockData && (
                            <span style={{
                                marginLeft: '12px',
                                fontSize: '14px',
                                opacity: 0.9,
                                background: 'rgba(255,255,255,0.2)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 'normal'
                            }}>
                                演示模式
                            </span>
                        )}
                    </div>
                    <div className="header-subtitle">
                        基于Stanford SNAP数据集 - {networkData?.metadata?.totalNodes || 100}个商品，{networkData?.metadata?.totalEdges || 353}条共购关系
                        {isUsingMockData && ' (使用模拟数据)'}
                    </div>
                </div>
            </Header>

            {error && !isUsingMockData && (
                <Alert
                    message="服务连接失败"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <button
                            className="retry-btn"
                            onClick={handleRetry}
                            style={{
                                background: '#1890ff',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            重试连接
                        </button>
                    }
                    style={{ margin: '0 24px', marginTop: '16px' }}
                />
            )}

            {isUsingMockData && (
                <Alert
                    message="演示模式"
                    description="当前使用模拟数据进行演示。"
                    type="info"
                    showIcon
                    action={
                        <button
                            className="retry-btn"
                            onClick={handleRetry}
                            style={{
                                background: '#1890ff',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            重新连接
                        </button>
                    }
                    style={{ margin: '0 24px', marginTop: '16px' }}
                />
            )}
            <Layout>
                <Sider
                    width={350}
                    className="app-sider"
                    breakpoint="lg"
                    collapsedWidth="0"
                >
                    <div className="sider-content">
                        <SearchPanel
                            groups={groups}
                            onNodeSelect={handleNodeClick}
                            onGroupFilter={handleGroupFilter}
                            selectedNode={selectedNode}
                            isUsingMockData={isUsingMockData}
                            networkData={networkData}
                        />

                        <StatisticsPanel
                            statistics={statistics}
                            popularNodes={popularNodes}
                            isLoading={false}
                        />
                    </div>
                </Sider>
                <Layout className="app-main-layout">
                    <Content className="app-content">
                        <Row gutter={[16, 16]} className="content-row">
                            <Col xs={24} lg={16}>
                                <NetworkGraph
                                    data={networkData}
                                    onNodeClick={handleNodeClick}
                                    selectedNode={selectedNode}
                                    highlightedNodes={highlightedNodes}
                                    isLoading={false}
                                    onViewAll={handleViewAllNodes}
                                />
                            </Col>
                            <Col xs={24} lg={8}>
                                <NodeDetail
                                    node={selectedNode}
                                    onViewNeighborDetail={handleViewNeighborDetail}
                                    onViewAllRelated={handleViewAllRelated}
                                    onClearHighlight={handleClearHighlight}
                                    onClose={() => {
                                        setSelectedNode(null);
                                        setHighlightedNodes([]);
                                    }}
                                    isUsingMockData={isUsingMockData}
                                    networkData={networkData}
                                    highlightedNodes={highlightedNodes}
                                />
                            </Col>
                        </Row>
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
}

export default App;