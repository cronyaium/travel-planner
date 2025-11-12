import React, { useState } from "react";
import {
    Table,
    Tag,
    Button,
    Card,
    Modal,
    Descriptions,
    Typography,
    Row,
    Col,
    Statistic
} from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { TripData, Segment } from "../types/TripData"; // 导入定义的类型
import "./TripPlanner.css";

const { Title, Text } = Typography;

// 定义组件接收的属性类型
interface TripPlannerProps {
    tripData: TripData; // 接收TripData类型的参数
}

const TripPlanner: React.FC<TripPlannerProps> = ({ tripData }) => {
    // 状态管理
    const [expandedDayKeys, setExpandedDayKeys] = useState<React.Key[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 切换日期展开/折叠
    const handleDayExpand = (expanded: boolean, day: number) => {
        setExpandedDayKeys(expanded ? [day] : []);
    };

    // 查看活动详情
    const showSegmentDetails = (segment: Segment) => {
        setSelectedSegment(segment);
        setIsModalOpen(true);
    };

    // 关闭弹窗
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedSegment(null);
    };

    // 分类标签颜色映射
    const categoryColors: Record<string, string> = {
        住宿: "purple",
        交通: "blue",
        餐饮: "red",
        景点: "green",
        购物: "gold",
        文化: "orange",
    };

    // 每日行程概览表格列定义
    const dayOverviewColumns = [
        {
            title: "天数",
            dataIndex: "day",
            key: "day",
            render: (day: number) => <Text strong>第 {day} 天</Text>,
            width: 80,
        },
        {
            title: "主要活动",
            dataIndex: "segments",
            key: "mainActivity",
            render: (segments: Segment[]) => segments[0]?.activity || "无活动安排",
        },
        {
            title: "当日总费用",
            dataIndex: "dailyTotalCost",
            key: "dailyCost",
            render: (cost: number) => (
                <Text strong>{cost.toLocaleString()} {tripData.budgetAnalysis.currency}</Text>
            ),
            width: 140,
        },
        {
            title: "操作",
            key: "action",
            render: (_: any, record: { day: number }) => (
                <Button
                    type="text"
                    onClick={() => handleDayExpand(!expandedDayKeys.includes(record.day), record.day)}
                >
                    {expandedDayKeys.includes(record.day) ? "收起详情" : "展开详情"}
                </Button>
            ),
            width: 120,
        },
    ];

    // 每日活动详情表格列定义
    const segmentDetailColumns = [
        {
            title: "时间",
            dataIndex: "time",
            key: "time",
            width: 80,
        },
        {
            title: "活动内容",
            dataIndex: "activity",
            key: "activity",
        },
        {
            title: "地点",
            dataIndex: "location",
            key: "location",
            width: 150,
        },
        {
            title: "分类",
            dataIndex: "category",
            key: "category",
            render: (category: string) => (
                <Tag color={categoryColors[category] || "default"}>{category}</Tag>
            ),
            width: 100,
        },
        {
            title: "费用",
            dataIndex: "cost",
            key: "cost",
            render: (cost: number) => `${cost} ${tripData.budgetAnalysis.currency}`,
            width: 100,
        },
        {
            title: "详情",
            key: "action",
            render: (_: any, record: Segment) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => showSegmentDetails(record)}
                >
                    查看
                </Button>
            ),
            width: 80,
        },
    ];

    // 预算分类表格列定义
    const budgetCategoryColumns = [
        {
            title: "费用分类",
            dataIndex: "category",
            key: "category",
            render: (category: string) => (
                <Tag color={categoryColors[category] || "default"}>{category}</Tag>
            ),
        },
        {
            title: "金额",
            dataIndex: "amount",
            key: "amount",
            render: (amount: number) => `${amount} ${tripData.budgetAnalysis.currency}`,
        },
        {
            title: "占比",
            dataIndex: "percentage",
            key: "percentage",
            render: (percentage: string) => `${percentage}%`,
        },
    ];

    // 处理预算分类数据
    const budgetCategoryData = Object.entries(tripData.budgetAnalysis.categories).map(
        ([category, amount]) => ({
            key: category,
            category,
            amount,
            percentage: ((amount / tripData.budgetAnalysis.estimatedTotal) * 100).toFixed(1),
        })
    );

    return (
        <div className="trip-container" style={{ padding: "20px" }}>
            {/* 行程基本信息卡片 */}
            <Card className="trip-card" style={{ marginBottom: 20 }}>
                <Title level={2} style={{ marginBottom: 16 }}>
                    {tripData.tripIntent.destination} {tripData.tripIntent.days}日游行程
                </Title>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Text strong>出行季节：</Text>
                        <Text>{tripData.tripIntent.season}</Text>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Text strong>交通方式：</Text>
                        <Text>{tripData.tripIntent.transportMode}</Text>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Text strong>同行人员：</Text>
                        <Text>{tripData.userProfile.companions}</Text>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Text strong>旅行偏好：</Text>
                        <Text>{tripData.userProfile.preferences.join("、")}</Text>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="总预算"
                            value={tripData.tripIntent.budget}
                            suffix={tripData.budgetAnalysis.currency}
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="预计花费"
                            value={tripData.budgetAnalysis.estimatedTotal}
                            suffix={tripData.budgetAnalysis.currency}
                            valueStyle={{ color: "#3f8600" }}
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="预算余额"
                            value={tripData.tripIntent.budget - tripData.budgetAnalysis.estimatedTotal}
                            suffix={tripData.budgetAnalysis.currency}
                            valueStyle={{ color: tripData.tripIntent.budget >= tripData.budgetAnalysis.estimatedTotal ? "#1890ff" : "#f50" }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* 预算分类分析 */}
            <Card title="费用分类分析" className="trip-card" style={{ marginBottom: 20 }}>
                <Table
                    dataSource={budgetCategoryData}
                    columns={budgetCategoryColumns}
                    pagination={false}
                    bordered
                    size="middle"
                />
            </Card>

            {/* 每日行程安排 */}
            <Card title="每日行程详情" className="trip-card">
                <Table
                    dataSource={tripData.tripPlan.map((dayPlan) => ({
                        ...dayPlan,
                        key: dayPlan.day,
                    }))}
                    columns={dayOverviewColumns}
                    expandable={{
                        expandedRowKeys: expandedDayKeys,
                        expandRowByClick: false,
                        onExpand: (expanded, record) => handleDayExpand(expanded, record.day),
                        expandedRowRender: (record) => (
                            <Table
                                dataSource={record.segments.map((s, i) => ({
                                    ...s,
                                    key: i,
                                }))}
                                columns={segmentDetailColumns}
                                pagination={false}
                                bordered
                                size="small"
                                style={{ marginTop: 10 }}
                            />
                        ),
                    }}
                    pagination={false}
                    bordered
                />
            </Card>

            {/* 活动详情弹窗 */}
            <Modal
                title="活动详情"
                open={isModalOpen}
                onCancel={handleModalClose}
                onOk={handleModalClose}
                okText="确定"
                cancelText="关闭"
                destroyOnClose
            >
                {selectedSegment && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="时间">{selectedSegment.time}</Descriptions.Item>
                        <Descriptions.Item label="活动内容">{selectedSegment.activity}</Descriptions.Item>
                        <Descriptions.Item label="地点">{selectedSegment.location}</Descriptions.Item>
                        <Descriptions.Item label="分类">
                            <Tag color={categoryColors[selectedSegment.category] || "default"}>
                                {selectedSegment.category}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="费用">
                            {selectedSegment.cost} {tripData.budgetAnalysis.currency}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default TripPlanner;