import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import TripPlanner from "../components/TripPlanner";

interface Trip {
    id: number;
    tripName: string;
    userId: string;
    tripDataJson: string;
    createdTime: string;
    updatedTime: string;
}

const TripsPage: React.FC = () => {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);

    const query = new URLSearchParams(useLocation().search);
    const userId = query.get("userId");

    const fetchTrips = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8080/api/trips/user/${userId}`);
            if (!res.ok) throw new Error(`请求失败: ${res.status}`);
            const data: Trip[] = await res.json();
            setTrips(data);
        } catch (err) {
            console.error(err);
            alert("获取行程失败");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("确定要删除该行程吗？")) return;
        try {
            const res = await fetch(`http://localhost:8080/api/trips/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(`删除失败: ${res.status}`);
            setTrips(trips.filter((trip) => trip.id !== id));
        } catch (err) {
            console.error(err);
            alert("删除失败");
        }
    };

    useEffect(() => {
        fetchTrips();
    }, [userId]);

    if (!userId) return <div>用户未登录</div>;

    return (
        <div>
            <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>我的行程</h2>
            {loading && <p>加载中...</p>}
            {!loading && trips.length === 0 && <p>暂无行程</p>}
            <ul>
                {trips.map((trip) => (
                    <div>
                        <TripPlanner tripData={JSON.parse(trip.tripDataJson)}/>
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={() => handleDelete(trip.id)}
                                style={{
                                    padding: '8px 16px',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginBottom: '1rem',
                                    fontSize: '14px'
                                }}
                            >
                                删除
                            </button>
                        </div>
                    </div>
                ))}
            </ul>
        </div>
    );
};

export default TripsPage;
