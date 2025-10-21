package com.amazon.analysis.product_network.controller;

import com.amazon.analysis.product_network.model.NetworkData;
import com.amazon.analysis.product_network.model.Node;
import com.amazon.analysis.product_network.service.NetworkDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 商品共购网络API控制器
 * 提供RESTful API接口供React前端调用
 * 所有接口都以/api/network为前缀
 */
@RestController
@RequestMapping("/api/network")
public class NetworkController {

    private static final Logger log = LoggerFactory.getLogger(NetworkController.class);

    @Autowired
    private NetworkDataService networkDataService;

    /**
     * 获取完整的商品共购网络数据 用于初始化前端力导向图
     * @return ResponseEntity<NetworkData> 包含节点和边的完整网络数据
     */
    @GetMapping("/full")
    public ResponseEntity<NetworkData> getFullNetwork() {
        log.info("📊 API调用 - 获取完整网络数据");
        NetworkData networkData = networkDataService.getFullNetworkData();
        if (networkData != null && networkData.getNodes() != null && networkData.getLinks() != null) {
            log.info("✅ 返回完整网络数据: {}节点, {}边",
                    networkData.getNodes().size(), networkData.getLinks().size());
        } else {
            log.warn("⚠️ 网络数据为空或部分为空");
        }
        return ResponseEntity.ok(networkData);
    }

    /**
     * 获取网络整体统计信息 用于前端显示概览数据
     * @return ResponseEntity<Map> 包含各种统计数据的映射
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getNetworkStatistics() {
        log.info("📈 API调用 - 获取网络统计信息");
        Map<String, Object> statistics = networkDataService.getNetworkStatistics();
        log.info("✅ 返回网络统计信息，包含 {} 个统计指标", statistics.size());
        return ResponseEntity.ok(statistics);
    }

    /**
     * 获取所有商品类别列表 用于前端筛选和分类显示
     * @return ResponseEntity<List> 去重后的商品类别列表
     */
    @GetMapping("/groups")
    public ResponseEntity<List<String>> getAllGroups() {
        log.info("🏷️ API调用 - 获取所有商品类别");
        List<String> groups = networkDataService.getAllGroups();
        log.info("✅ 返回 {} 个商品类别: {}", groups.size(), groups);
        return ResponseEntity.ok(groups);
    }

    /**
     * 根据商品类别获取该类别下的所有节点用于前端按类别筛选商品
     * @param group 商品类别
     * @return ResponseEntity<List> 该类别下的节点列表
     */
    @GetMapping("/nodes/group/{group}")
    public ResponseEntity<List<Node>> getNodesByGroup(@PathVariable String group) {
        log.info("🔍 API调用 - 根据类别获取节点: {}", group);
        List<Node> nodes = networkDataService.getNodesByGroup(group);
        log.info("✅ 返回类别 {} 的 {} 个节点", group, nodes.size());
        return ResponseEntity.ok(nodes);
    }

    /**
     * 根据节点ID获取特定节点的详细信息 用于前端显示节点详情弹窗
     * @param id 节点ID
     * @return ResponseEntity<Node> 节点详细信息，如果不存在返回404
     */
    @GetMapping("/nodes/{id}")
    public ResponseEntity<Node> getNodeById(@PathVariable Integer id) {
        log.info("🔎 API调用 - 获取节点详情: {}", id);
        Node node = networkDataService.getNodeById(id);

        if (node != null) {
            log.info("✅ 找到节点 {}: {}", id, node.getTitle());
            return ResponseEntity.ok(node);
        } else {
            log.warn("❌ 未找到节点: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 获取连接度最高的节点（热门商品） 用于前端显示重要节点或推荐
     * @param limit 返回节点的数量，默认为10
     * @return ResponseEntity<List> 按连接度降序排列的节点列表
     */
    @GetMapping("/nodes/highly-connected")
    public ResponseEntity<List<Node>> getHighlyConnectedNodes(
            @RequestParam(defaultValue = "10") Integer limit) {
        log.info("⭐ API调用 - 获取高度连接节点，限制: {}", limit);
        List<Node> nodes = networkDataService.getHighlyConnectedNodes(limit);
        log.info("✅ 返回 {} 个高度连接节点", nodes.size());
        return ResponseEntity.ok(nodes);
    }

    /**
     * 获取指定节点的所有邻居节点 用于前端高亮显示相关商品
     * @param id 中心节点ID
     * @return ResponseEntity<List> 邻居节点列表
     */
    @GetMapping("/nodes/{id}/neighbors")
    public ResponseEntity<List<Node>> getNeighborNodes(@PathVariable Integer id) {
        log.info("🕸️ API调用 - 获取节点 {} 的邻居节点", id);
        List<Node> neighbors = networkDataService.getNeighborNodes(id);
        log.info("✅ 返回节点 {} 的 {} 个邻居节点", id, neighbors.size());
        return ResponseEntity.ok(neighbors);
    }

    /**
     * 根据关键词搜索商品节点 用于前端搜索功能
     * @param keyword 搜索关键词
     * @return ResponseEntity<List> 匹配的节点列表
     */
    @GetMapping("/nodes/search")
    public ResponseEntity<List<Node>> searchNodes(@RequestParam String keyword) {
        log.info("🔎 API调用 - 搜索节点，关键词: {}", keyword);
        List<Node> results = networkDataService.searchNodes(keyword);
        log.info("✅ 搜索 '{}' 返回 {} 个结果", keyword, results.size());
        return ResponseEntity.ok(results);
    }

    /**
     * 健康检查接口 用于前端或监控系统检查服务状态
     * @return ResponseEntity<String> 服务状态信息
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        log.info("❤️ 健康检查请求");
        return ResponseEntity.ok("✅ 商品共购关系分析平台后端服务运行正常");
    }
}