import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, Spin, Alert, Button, Space, Tooltip, Select, Slider, Row, Col } from 'antd';
import {
    ReloadOutlined,
    PauseOutlined,
    FilterOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    ExpandOutlined,
    CompressOutlined
} from '@ant-design/icons';
import './NetworkGraph.css';

const { Option } = Select;

const GROUP_COLORS = {
    'Book': '#1890ff',
    'Music': '#52c41a',
    'DVD': '#faad14',
    'Video': '#f5222d',
    'Unknown': '#8c8c8c'
};

const CHART_CONFIG = {
    node: {
        radius: 6,
        fontSize: 10,
        strokeWidth: 2
    },
    link: {
        stroke: '#999',
        strokeOpacity: 0.6,
        strokeWidth: 1
    }
};

const NetworkGraph = ({
                          data,
                          onNodeClick,
                          selectedNode,
                          highlightedNodes = [],
                          isLoading = false
                      }) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const simulationRef = useRef();
    const zoomRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
    const [isSimulationRunning, setIsSimulationRunning] = useState(true);
    const [filteredGroup, setFilteredGroup] = useState('All');
    const [degreeThreshold, setDegreeThreshold] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity);

    // 过滤数据
    const filteredData = React.useMemo(() => {
        if (!data) return null;

        let filteredNodes = data.nodes;
        let filteredLinks = data.links;

        if (filteredGroup !== 'All') {
            filteredNodes = data.nodes.filter(node => node.group === filteredGroup);
            const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
            filteredLinks = data.links.filter(link =>
                filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
            );
        }

        if (degreeThreshold > 1) {
            filteredNodes = filteredNodes.filter(node => node.degree >= degreeThreshold);
            const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
            filteredLinks = data.links.filter(link =>
                filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
            );
        }

        return {
            nodes: filteredNodes,
            links: filteredLinks,
            metadata: data.metadata
        };
    }, [data, filteredGroup, degreeThreshold]);

    // D3 渲染
    useEffect(() => {
        if (!filteredData || !filteredData.nodes || !filteredData.links) return;
        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        // 创建容器组用于缩放
        const container = svg.append('g').attr('class', 'zoom-container');
        containerRef.current = container;
        // 创建力导向图模拟
        const simulation = d3.forceSimulation(filteredData.nodes)
            .force('link', d3.forceLink(filteredData.links)
                .id(d => d.id)
                .distance(50)
            )
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(20))
            .alphaDecay(0.02)
            .on('tick', ticked);
        simulationRef.current = simulation;
        //3秒后自动停止模拟并固定节点位置
        const autoStopTimer = setTimeout(() => {
            if (simulationRef.current) {
                simulationRef.current.stop();
                setIsSimulationRunning(false);
                // 固定所有节点的位置
                filteredData.nodes.forEach(node => {
                    node.fx = node.x;
                    node.fy = node.y;
                });
                ticked();
                console.log('模拟已自动停止，网络图变为静态');
            }
        }, 3000);
        // 创建连线
        const link = container.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(filteredData.links)
            .enter().append('line')
            .attr('stroke', CHART_CONFIG.link.stroke)
            .attr('stroke-opacity', CHART_CONFIG.link.strokeOpacity)
            .attr('stroke-width', CHART_CONFIG.link.strokeWidth);
        // 创建节点
        const node = container.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(filteredData.nodes)
            .enter().append('circle')
            .attr('r', d => Math.max(CHART_CONFIG.node.radius, Math.min(12, CHART_CONFIG.node.radius + (d.degree || 0) * 0.3)))
            .attr('fill', d => GROUP_COLORS[d.group] || GROUP_COLORS.Unknown)
            .attr('stroke', '#fff')
            .attr('stroke-width', CHART_CONFIG.node.strokeWidth)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                console.log('节点被点击:', d);
                onNodeClick(d);
            })
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 3)
                    .attr('r', d => Math.max(CHART_CONFIG.node.radius + 2, Math.min(14, CHART_CONFIG.node.radius + 2 + (d.degree || 0) * 0.3)));
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', CHART_CONFIG.node.strokeWidth)
                    .attr('r', d => Math.max(CHART_CONFIG.node.radius, Math.min(12, CHART_CONFIG.node.radius + (d.degree || 0) * 0.3)));
            });
        node.append('title')
            .text(d => `${d.title || d.asin}\nGroup: ${d.group}\nDegree: ${d.degree}`);
        // 添加节点标签
        const label = container.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(filteredData.nodes.filter(d => d.degree >= 5))
            .enter().append('text')
            .text(d => d.title ? (d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title) : d.asin)
            .attr('font-size', CHART_CONFIG.node.fontSize)
            .attr('dx', 15)
            .attr('dy', 4)
            .style('pointer-events', 'none')
            .style('user-select', 'none')
            .style('fill', '#333')
            .style('font-weight', 'normal');
        // 高亮效果应用函数
        const applyHighlightEffects = (nodeSelection, linkSelection, labelSelection, highlightedNodeIds) => {
            if (highlightedNodeIds.size === 0) {
                nodeSelection.attr('opacity', 1);
                linkSelection.attr('stroke-opacity', CHART_CONFIG.link.strokeOpacity);
                labelSelection.attr('opacity', 1);
            } else {
                nodeSelection.attr('opacity', d =>
                    highlightedNodeIds.has(d.id) ? 1 : 0.2
                );
                linkSelection.attr('stroke-opacity', l => {
                    const sourceId = l.source.id || l.source;
                    const targetId = l.target.id || l.target;
                    return highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId) ? 1 : 0.1;
                });
                labelSelection.attr('opacity', d =>
                    highlightedNodeIds.has(d.id) ? 1 : 0.2
                );
            }
        };
        // 初始应用高亮效果
        applyHighlightEffects(node, link, label, new Set(highlightedNodes));
        function ticked() {
            const transform = currentTransform;
            // 更新连线位置
            link
                .attr('x1', d => transform.applyX(d.source.x))
                .attr('y1', d => transform.applyY(d.source.y))
                .attr('x2', d => transform.applyX(d.target.x))
                .attr('y2', d => transform.applyY(d.target.y));
            // 更新节点位置
            node
                .attr('cx', d => transform.applyX(d.x))
                .attr('cy', d => transform.applyY(d.y));
            // 更新标签位置
            label
                .attr('x', d => transform.applyX(d.x))
                .attr('y', d => transform.applyY(d.y));
        }
        // 设置缩放行为
        const zoom = d3.zoom()
            .scaleExtent([0.1, 8])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
                setCurrentTransform(event.transform);
                setZoomLevel(event.transform.k);
                ticked();
            });
        zoomRef.current = zoom;
        svg.call(zoom);
        // 响应式调整
        const handleResize = () => {
            setDimensions({
                width: svgRef.current.parentElement.clientWidth,
                height: Math.max(500, window.innerHeight * 0.75)
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            clearTimeout(autoStopTimer);
            if (simulationRef.current) {
                simulationRef.current.stop();
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [filteredData, dimensions, isSimulationRunning, onNodeClick, currentTransform]);

    // 高亮效果更新
    useEffect(() => {
        if (!filteredData || !filteredData.nodes || !filteredData.links) return;

        const svg = d3.select(svgRef.current);
        const node = svg.selectAll('.nodes circle');
        const link = svg.selectAll('.links line');
        const label = svg.selectAll('.labels text');

        if (node.empty() || link.empty()) return;

        const highlightedSet = new Set(highlightedNodes);

        if (highlightedSet.size === 0) {
            node.attr('opacity', 1);
            link.attr('stroke-opacity', CHART_CONFIG.link.strokeOpacity);
            label.attr('opacity', 1);
        } else {
            node.attr('opacity', d =>
                highlightedSet.has(d.id) ? 1 : 0.2
            );
            link.attr('stroke-opacity', l => {
                const sourceId = l.source.id || l.source;
                const targetId = l.target.id || l.target;
                return highlightedSet.has(sourceId) && highlightedSet.has(targetId) ? 1 : 0.1;
            });
            label.attr('opacity', d =>
                highlightedSet.has(d.id) ? 1 : 0.2
            );
        }
    }, [highlightedNodes, filteredData]);

    // 缩放控制函数
    const handleZoomIn = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
    };

    const handleZoomOut = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.75);
    };

    const handleResetZoom = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
        setZoomLevel(1);
        setCurrentTransform(d3.zoomIdentity);
    };

    const handleFitToView = () => {
        if (!filteredData || !filteredData.nodes.length) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
        setZoomLevel(1);
        setCurrentTransform(d3.zoomIdentity);
    };

    const handleResetSimulation = () => {
        setIsSimulationRunning(true);
        handleResetZoom();

        if (simulationRef.current && filteredData) {
            // 清除固定位置
            filteredData.nodes.forEach(node => {
                node.fx = null;
                node.fy = null;
            });
            simulationRef.current.alpha(0.3).restart();

            // 3秒后再次自动停止
            setTimeout(() => {
                if (simulationRef.current) {
                    simulationRef.current.stop();
                    setIsSimulationRunning(false);
                    filteredData.nodes.forEach(node => {
                        node.fx = node.x;
                        node.fy = node.y;
                    });
                }
            }, 3000);
        }
    };

    const handlePauseSimulation = () => {
        setIsSimulationRunning(false);
        if (simulationRef.current) {
            simulationRef.current.stop();
            // 固定节点位置
            if (filteredData) {
                filteredData.nodes.forEach(node => {
                    node.fx = node.x;
                    node.fy = node.y;
                });
            }
        }
    };

    // 统计信息
    const stats = filteredData ? {
        totalNodes: filteredData.nodes.length,
        totalLinks: filteredData.links.length,
        groups: [...new Set(filteredData.nodes.map(node => node.group))].sort()
    } : null;

    if (isLoading) {
        return (
            <Card>
                <div className="network-graph-loading">
                    <Spin size="large" />
                    <div>正在加载网络数据...</div>
                </div>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <Alert
                    message="数据加载失败"
                    description="无法获取网络数据。"
                    type="error"
                    showIcon
                />
            </Card>
        );
    }

    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>商品共购关系网络图</span>
                    <div style={{
                        fontSize: '12px',
                        color: isSimulationRunning ? '#52c41a' : '#faad14',
                        fontWeight: 'normal'
                    }}>
                        {isSimulationRunning ? '🔄 模拟运行中...' : '静态模式'}
                    </div>
                </div>
            }
            extra={
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleResetSimulation}
                    >
                        {isSimulationRunning ? '模拟中...' : '重新模拟'}
                    </Button>
                    <Button
                        icon={<PauseOutlined />}
                        onClick={handlePauseSimulation}
                        disabled={!isSimulationRunning}
                    >
                        暂停模拟
                    </Button>
                </Space>
            }
            className="network-graph-card"
        >
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
                <Row gutter={16} align="middle">
                    <Col flex="none">
                        <Space>
                            <FilterOutlined />
                            <span>筛选条件:</span>
                        </Space>
                    </Col>
                    <Col flex="200px">
                        <Select
                            value={filteredGroup}
                            onChange={setFilteredGroup}
                            style={{ width: '100%' }}
                        >
                            <Option value="All">全部分组</Option>
                            {Object.keys(GROUP_COLORS).map(group => (
                                <Option key={group} value={group}>{group}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col flex="auto">
                        <Space style={{ width: '100%' }}>
                            <span>节点度数:</span>
                            <Slider
                                min={1}
                                max={20}
                                value={degreeThreshold}
                                onChange={setDegreeThreshold}
                                style={{ minWidth: 150 }}
                                tooltip={{ formatter: value => `≥ ${value}` }}
                            />
                            <span>≥ {degreeThreshold}</span>
                        </Space>
                    </Col>
                    <Col flex="none">
                        {stats && (
                            <span style={{ color: '#666', fontSize: 12 }}>
                                显示: {stats.totalNodes} 节点, {stats.totalLinks} 关系
                                {highlightedNodes.length > 0 && (
                                    <span style={{ color: '#52c41a', marginLeft: 8 }}>
                                        • 高亮: {highlightedNodes.length} 节点
                                    </span>
                                )}
                                <span style={{ color: '#1890ff', marginLeft: 8 }}>• 缩放: {(zoomLevel * 100).toFixed(0)}%</span>
                                <span style={{
                                    color: isSimulationRunning ? '#52c41a' : '#faad14',
                                    marginLeft: 8
                                }}>
                                    • {isSimulationRunning ? '模拟运行中' : '静态模式'}
                                </span>
                            </span>
                        )}
                    </Col>
                </Row>
            </div>

            <div className="network-graph-container">
                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="network-graph"
                />

                <div className="zoom-controls-panel">
                    <Tooltip title="放大">
                        <Button
                            icon={<ZoomInOutlined />}
                            size="small"
                            type="text"
                            onClick={handleZoomIn}
                            className="zoom-control-btn"
                        />
                    </Tooltip>
                    <div className="zoom-level-display">
                        {(zoomLevel * 100).toFixed(0)}%
                    </div>
                    <Tooltip title="缩小">
                        <Button
                            icon={<ZoomOutOutlined />}
                            size="small"
                            type="text"
                            onClick={handleZoomOut}
                            className="zoom-control-btn"
                        />
                    </Tooltip>
                    <Tooltip title="适应视图">
                        <Button
                            icon={<CompressOutlined />}
                            size="small"
                            type="text"
                            onClick={handleFitToView}
                            className="zoom-control-btn"
                        />
                    </Tooltip>
                    <Tooltip title="重置缩放">
                        <Button
                            icon={<ExpandOutlined />}
                            size="small"
                            type="text"
                            onClick={handleResetZoom}
                            className="zoom-control-btn"
                        />
                    </Tooltip>
                </div>

                <div className="network-graph-legend">
                    <div className="legend-title">商品类别</div>
                    {Object.entries(GROUP_COLORS).map(([group, color]) => (
                        <div key={group} className="legend-item">
                            <span
                                className="legend-color"
                                style={{ backgroundColor: color }}
                            />
                            <span className="legend-label">{group}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default NetworkGraph;