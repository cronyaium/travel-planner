import { useState } from "react";
import { getCloudBaseAuth } from "../utils/cloudbase";
import { useNavigate, Link } from "react-router-dom";

// 登录方式类型
type LoginType = "phone" | "email" | "username";

const Login = () => {
    // 表单状态
    const [loginType, setLoginType] = useState<LoginType>("username"); // 默认用户名登录
    const [account, setAccount] = useState(""); // 账号（手机号/邮箱/用户名）
    const [password, setPassword] = useState(""); // 密码
    const [isLoading, setIsLoading] = useState(false); // 登录按钮加载状态

    const auth = getCloudBaseAuth();
    const navigate = useNavigate();

    // 切换登录方式
    const handleLoginTypeChange = (type: LoginType) => {
        setLoginType(type);
        setAccount(""); // 切换时清空账号输入框
    };

    // 执行登录
    const handleLogin = async () => {
        // 表单校验
        if (!account.trim()) {
            alert(`请输入${getAccountLabel()}`);
            return;
        }
        if (!password) {
            alert("请输入密码");
            return;
        }

        setIsLoading(true);
        try {
            // 调用CloudBase登录接口（支持三种方式）
            await auth.signIn({
                username: account.trim(), // 账号（手机号/邮箱/用户名通用）
                password: password,
            });

            // 登录成功：获取用户信息并跳转首页
            const userInfo = await auth.getUserInfo();
            console.log("登录成功，用户信息：", userInfo);
            alert(`欢迎回来，${userInfo.name || userInfo.username}`);
            navigate("/"); // 跳转到首页
        } catch (err: any) {
            console.error("登录失败：", err);
            // 错误提示优化
            const errorMsg = err.message || "登录失败，请检查账号密码";
            if (errorMsg.includes("user not found")) {
                alert("用户不存在，请先注册");
            } else if (errorMsg.includes("invalid password")) {
                alert("密码错误，请重新输入");
            } else {
                alert(errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 根据登录方式获取账号输入框标签
    const getAccountLabel = () => {
        switch (loginType) {
            case "phone":
                return "手机号（如+8613800000000）";
            case "email":
                return "邮箱地址";
            case "username":
                return "用户名";
            default:
                return "账号";
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "4rem auto", padding: "0 1rem" }}>
            <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>用户登录</h2>

            {/* 登录方式选择 */}
            <div style={{ marginBottom: "1.5rem", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                    onClick={() => handleLoginTypeChange("username")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: loginType === "username" ? "#1890ff" : "#f0f0f0",
                        color: loginType === "username" ? "white" : "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    用户名登录
                </button>
                <button
                    onClick={() => handleLoginTypeChange("phone")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: loginType === "phone" ? "#1890ff" : "#f0f0f0",
                        color: loginType === "phone" ? "white" : "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    手机号登录
                </button>
                <button
                    onClick={() => handleLoginTypeChange("email")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: loginType === "email" ? "#1890ff" : "#f0f0f0",
                        color: loginType === "email" ? "white" : "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    邮箱登录
                </button>
            </div>

            {/* 账号输入框 */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    {getAccountLabel()} <span style={{ color: "red" }}>*</span>
                </label>
                <input
                    type={loginType === "email" ? "email" : loginType === "phone" ? "tel" : "text"}
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={`请输入${getAccountLabel()}`}
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                    }}
                />
            </div>

            {/* 密码输入框 */}
            <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    密码 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                    }}
                />
                <div style={{ textAlign: "right", marginTop: "4px" }}>
                    <a
                        href="#"
                        style={{ color: "#1890ff", fontSize: "12px", textDecoration: "none" }}
                        onClick={(e) => {
                            e.preventDefault();
                            alert("密码找回功能待实现"); // 可后续对接密码重置接口
                        }}
                    >
                        忘记密码？
                    </a>
                </div>
            </div>

            {/* 登录按钮 */}
            <button
                onClick={handleLogin}
                disabled={isLoading}
                style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#1890ff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "16px",
                    cursor: "pointer",
                    opacity: isLoading ? 0.7 : 1,
                }}
            >
                {isLoading ? "登录中..." : "登录"}
            </button>

            {/* 注册链接 */}
            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "14px" }}>
                还没有账号？{" "}
                <Link to="/register" style={{ color: "#1890ff", textDecoration: "underline" }}>
                    去注册
                </Link>
            </div>
        </div>
    );
};

export default Login;