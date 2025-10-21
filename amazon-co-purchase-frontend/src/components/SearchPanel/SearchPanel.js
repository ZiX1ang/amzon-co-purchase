import React, { useState, useEffect } from 'react';
import {
    Card,
    Input,
    Select,
    List,
    Tag,
    Button,
    Empty,
    Spin,
    Alert
} from 'antd';
import {
    SearchOutlined,
    FilterOutlined,
    StarOutlined
} from '@ant-design/icons';
import { GROUP_COLORS } from '../../utils/constants';
import './SearchPanel.css';

const { Search } = Input;
const { Option } = Select;

// 模拟搜索函数
const mockSearchResults = (keyword, allNodes) => {
    if (!keyword || !allNodes) return [];

    return allNodes.filter(node =>
        node.title.toLowerCase().includes(keyword.toLowerCase()) ||
        node.asin.toLowerCase().includes(keyword.toLowerCase()) ||
        node.group.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 10);
};

const SearchPanel = ({
                         groups = [],
                         onNodeSelect,
                         onGroupFilter,
                         selectedNode,
                         isUsingMockData = false,
                         networkData
                     }) => {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [popularNodes, setPopularNodes] = useState([]);

    // 加载热门商品
    useEffect(() => {
        const loadPopularNodes = async () => {
            try {
                if (isUsingMockData) {
                    // 使用模拟热门商品数据
                    const mockPopular = networkData?.nodes
                        ?.sort((a, b) => b.degree - a.degree)
                        .slice(0, 10) || [];
                    setPopularNodes(mockPopular);
                } else {
                    const { networkAPI } = await import('../../services/api');
                    const response = await networkAPI.getHighlyConnectedNodes(10);
                    setPopularNodes(response.data);
                }
            } catch (error) {
                console.error('加载热门商品失败:', error);
                // 如果失败，使用网络数据中的节点作为备选
                const fallbackPopular = networkData?.nodes
                    ?.sort((a, b) => b.degree - a.degree)
                    .slice(0, 5) || [];
                setPopularNodes(fallbackPopular);
            }
        };

        loadPopularNodes();
    }, [isUsingMockData, networkData]);

    // 搜索处理
    const handleSearch = async (value) => {
        if (!value.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            if (isUsingMockData) {
                // 使用模拟搜索
                const results = mockSearchResults(value, networkData?.nodes);
                setSearchResults(results);
            } else {
                const { networkAPI } = await import('../../services/api');
                const response = await networkAPI.searchNodes(value);
                setSearchResults(response.data);
            }
        } catch (error) {
            console.error('搜索失败:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // 类别筛选处理
    const handleGroupFilter = async (group) => {
        setSelectedGroup(group);
        if (group === 'all') {
            setSearchResults([]);
            onGroupFilter(null);
        } else {
            setIsSearching(true);
            try {
                if (isUsingMockData) {
                    // 使用模拟筛选
                    const filteredNodes = networkData?.nodes?.filter(node => node.group === group) || [];
                    setSearchResults(filteredNodes);
                    onGroupFilter(filteredNodes.map(node => node.id));
                } else {
                    const { networkAPI } = await import('../../services/api');
                    const response = await networkAPI.getNodesByGroup(group);
                    setSearchResults(response.data);
                    onGroupFilter(response.data.map(node => node.id));
                }
            } catch (error) {
                console.error('筛选失败:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }
    };

    // 清除筛选
    const handleClearFilters = () => {
        setSearchKeyword('');
        setSelectedGroup('all');
        setSearchResults([]);
        onGroupFilter(null);
    };

    return (
        <div className="search-panel">
            <Card title="搜索与筛选" className="search-card">
                <div className="search-controls">
                    <Search
                        placeholder="输入商品标题或ASIN搜索..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="large"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onSearch={handleSearch}
                        className="search-input"
                    />

                    <Select
                        value={selectedGroup}
                        onChange={handleGroupFilter}
                        placeholder="选择商品类别"
                        className="group-filter"
                        size="large"
                        suffixIcon={<FilterOutlined />}
                    >
                        <Option value="all">所有类别</Option>
                        {groups.map(group => (
                            <Option key={group} value={group}>
                                <Tag color={GROUP_COLORS[group] || GROUP_COLORS.Default}>{group}</Tag>
                            </Option>
                        ))}
                    </Select>

                    <Button
                        onClick={handleClearFilters}
                        className="clear-filters-btn"
                    >
                        清除筛选
                    </Button>
                </div>
            </Card>
            <Card
                title={`搜索结果 (${searchResults.length})`}
                className="results-card"
                bodyStyle={{ padding: '0' }}
            >
                {isSearching ? (
                    <div className="search-loading">
                        <Spin size="large" />
                        <div>搜索中...</div>
                    </div>
                ) : searchResults.length > 0 ? (
                    <List
                        dataSource={searchResults}
                        renderItem={(node) => (
                            <List.Item
                                className={`search-result-item ${
                                    selectedNode?.id === node.id ? 'selected' : ''
                                }`}
                                onClick={() => onNodeSelect(node)}
                            >
                                <div className="result-item-content">
                                    <div className="result-item-title">
                                        {node.title || '无标题'}
                                    </div>
                                    <div className="result-item-meta">
                                        <Tag color={GROUP_COLORS[node.group] || GROUP_COLORS.Default}>
                                            {node.group}
                                        </Tag>
                                        <span className="result-item-asin">ASIN: {node.asin}</span>
                                        <span className="result-item-degree">
                      {node.degree} 个连接
                    </span>
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            searchKeyword || selectedGroup !== 'all'
                                ? "未找到匹配的商品"
                                : "请输入关键词搜索或选择类别筛选"
                        }
                    />
                )}
            </Card>
            {popularNodes.length > 0 && !searchKeyword && selectedGroup === 'all' && (
                <Card
                    title="热门商品推荐"
                    className="popular-card"
                    extra={<StarOutlined />}
                >
                    <List
                        size="small"
                        dataSource={popularNodes.slice(0, 5)}
                        renderItem={(node) => (
                            <List.Item
                                className="popular-item"
                                onClick={() => onNodeSelect(node)}
                            >
                                <div className="popular-item-content">
                                    <div className="popular-item-title">
                                        {node.title || node.asin}
                                    </div>
                                    <div className="popular-item-meta">
                                        <Tag color={GROUP_COLORS[node.group] || GROUP_COLORS.Default} size="small">
                                            {node.group}
                                        </Tag>
                                        <span className="popular-item-degree">
                      {node.degree} 连接
                    </span>
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

export default SearchPanel;