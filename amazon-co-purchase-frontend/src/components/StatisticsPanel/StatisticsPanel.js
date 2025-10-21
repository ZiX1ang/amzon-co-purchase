import React from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, List } from 'antd';
import { ShoppingOutlined, LinkOutlined, BarChartOutlined } from '@ant-design/icons';
import { GROUP_COLORS } from '../../utils/constants';
import './StatisticsPanel.css';

const StatisticsPanel = ({ statistics, popularNodes, isLoading }) => {
    if (!statistics) {
        return (
            <Card title="统计信息" loading={isLoading}>
                <div className="statistics-empty">暂无统计数据</div>
            </Card>
        );
    }

    const { groupDistribution, averageDegree, maxDegree, minDegree, totalNodes, totalEdges } = statistics;

    return (
        <div className="statistics-panel">
            <Card title="网络概览" className="statistics-card">
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={8}>
                        <Statistic
                            title="商品总数"
                            value={totalNodes}
                            prefix={<ShoppingOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Col>
                    <Col xs={12} sm={8}>
                        <Statistic
                            title="共购关系"
                            value={totalEdges}
                            prefix={<LinkOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="平均连接度"
                            value={averageDegree?.toFixed(2)}
                            prefix={<BarChartOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Col>
                </Row>
            </Card>

            <Card title="商品类别分布" className="distribution-card">
                <div className="distribution-list">
                    {Object.entries(groupDistribution || {}).map(([group, count]) => {
                        const percentage = ((count / totalNodes) * 100).toFixed(1);
                        return (
                            <div key={group} className="distribution-item">
                                <div className="distribution-header">
                                    <Tag color={GROUP_COLORS[group] || GROUP_COLORS.Default}>
                                        {group}
                                    </Tag>
                                    <span className="distribution-count">{count} 个商品</span>
                                    <span className="distribution-percentage">{percentage}%</span>
                                </div>
                                <Progress
                                    percent={parseFloat(percentage)}
                                    strokeColor={GROUP_COLORS[group] || GROUP_COLORS.Default}
                                    size="small"
                                    showInfo={false}
                                />
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card title="连接度统计" className="degree-card">
                <Row gutter={16}>
                    <Col span={8}>
                        <Statistic
                            title="最高连接度"
                            value={maxDegree}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title="最低连接度"
                            value={minDegree}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title="连接度范围"
                            value={`${minDegree}-${maxDegree}`}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Col>
                </Row>
            </Card>

            {popularNodes && popularNodes.length > 0 && (
                <Card title="热门商品（高连接度）" className="popular-nodes-card">
                    <List
                        size="small"
                        dataSource={popularNodes.slice(0, 5)}
                        renderItem={(node, index) => (
                            <List.Item>
                                <div className="popular-node-item">
                                    <span className="popular-node-rank">#{index + 1}</span>
                                    <div className="popular-node-info">
                                        <div className="popular-node-title">
                                            {node.title || node.asin}
                                        </div>
                                        <div className="popular-node-meta">
                                            <Tag color={GROUP_COLORS[node.group]}>
                                                {node.group}
                                            </Tag>
                                            <span className="popular-node-degree">
                        {node.degree} 个连接
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                </Card>
            )}
        </div>
    );
};

export default StatisticsPanel;