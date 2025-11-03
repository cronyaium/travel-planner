import { useState } from "react";
import { getCloudBaseAuth } from "../utils/cloudbase";
import { useNavigate } from "react-router-dom";

// 注册方式类型（手机号/邮箱）
type AuthType = "phone" | "email";

const Register = () => {
    // 表单状态
    const [authType, setAuthType] = useState<AuthType>("phone"); // 默认手机号注册
    const [phone, setPhone] = useState(""); // 手机号（带国家码，如+8613800000000）
    const [email, setEmail] = useState(""); // 邮箱
    const [username, setUsername] = useState(""); // 用户自定义用户名
    const [verificationCode, setVerificationCode] = useState(""); // 验证码
    const [password, setPassword] = useState(""); // 密码
    const [isSendingCode, setIsSendingCode] = useState(false); // 验证码发送状态
    const [verificationId, setVerificationId] = useState(""); // 验证ID（用于后续验证）

    const auth = getCloudBaseAuth();
    const navigate = useNavigate();

    // 切换注册方式（手机号/邮箱）
    const handleAuthTypeChange = (type: AuthType) => {
        setAuthType(type);
        // 切换时清空对应表单，避免混淆
        if (type === "phone") setEmail("");
        else setPhone("");
    };

    // 发送验证码
    const handleSendCode = async () => {
        // 校验表单
        const targetValue = authType === "phone" ? phone : email;
        if (!targetValue) {
            alert(`请输入${authType === "phone" ? "手机号" : "邮箱"}`);
            return;
        }
        if (!username) {
            alert("请设置用户名");
            return;
        }

        setIsSendingCode(true);
        try {
            // 调用CloudBase获取验证码接口
            const verification = await auth.getVerification({
                ...(authType === "phone" ? { phone_number: targetValue } : { email: targetValue }),
            });
            setVerificationId(verification.verification_id);
            alert(`${authType === "phone" ? "短信" : "邮件"}验证码已发送，请查收`);
        } catch (err: any) {
            console.error("发送验证码失败：", err);
            alert(`发送失败：${err.message || "未知错误"}`);
        } finally {
            setIsSendingCode(false);
        }
    };

    // 验证验证码并完成注册
    const handleRegister = async () => {
        // 校验表单
        const targetValue = authType === "phone" ? phone : email;
        if (!targetValue || !username || !verificationCode || !password) {
            alert("请完善所有信息");
            return;
        }
        if (!verificationId) {
            alert("请先获取验证码");
            return;
        }
        if (password.length < 6) {
            alert("密码长度不能少于6位");
            return;
        }

        try {
            // 1. 验证验证码
            const verificationTokenRes = await auth.verify({
                verification_id: verificationId,
                verification_code: verificationCode,
            });

            // 2. 注册新用户（使用用户自定义的用户名）
            await auth.signUp({
                ...(authType === "phone" ? { phone_number: targetValue } : { email: targetValue }),
                verification_code: verificationCode,
                verification_token: verificationTokenRes.verification_token,
                password: password,
                username: username, // 用户自定义用户名（核心新增）
                name: username, // 昵称默认与用户名一致（可选）
            });

            alert("注册成功！即将跳转到登录页");
            navigate("/login"); // 注册成功后跳转登录页
        } catch (err: any) {
            console.error("注册失败：", err);
            // 常见错误提示优化
            if (err.message.includes("username already exists")) {
                alert("用户名已被占用，请更换");
            } else {
                alert(`注册失败：${err.message || "未知错误"}`);
            }
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "2rem auto", padding: "0 1rem" }}>
            <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>用户注册</h2>

            {/* 选择注册方式 */}
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                <button
                    onClick={() => handleAuthTypeChange("phone")}
                    style={{
                        padding: "8px 16px",
                        marginRight: "10px",
                        backgroundColor: authType === "phone" ? "#1890ff" : "#f0f0f0",
                        color: authType === "phone" ? "white" : "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    手机号注册
                </button>
                <button
                    onClick={() => handleAuthTypeChange("email")}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: authType === "email" ? "#1890ff" : "#f0f0f0",
                        color: authType === "email" ? "white" : "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    邮箱注册
                </button>
            </div>

            {/* 用户名输入框（核心新增） */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    用户名 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder="请设置用户名（将用于登录和展示）"
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                    }}
                />
            </div>

            {/* 手机号/邮箱输入框（根据选择的注册方式显示） */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    {authType === "phone" ? "手机号" : "邮箱"} <span style={{ color: "red" }}>*</span>
                </label>
                <input
                    type={authType === "phone" ? "tel" : "email"}
                    value={authType === "phone" ? phone : email}
                    onChange={(e) => {
                        if (authType === "phone") setPhone(e.target.value.trim());
                        else setEmail(e.target.value.trim());
                    }}
                    placeholder={authType === "phone" ? "请输入手机号（如+8613800000000）" : "请输入邮箱地址"}
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                    }}
                />
                <button
                    onClick={handleSendCode}
                    disabled={isSendingCode}
                    style={{
                        marginTop: "8px",
                        padding: "8px 16px",
                        backgroundColor: "#4cd964",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    {isSendingCode ? "发送中..." : `发送${authType === "phone" ? "短信" : "邮件"}验证码`}
                </button>
            </div>

            {/* 验证码输入框 */}
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                    验证码 <span style={{ color: "red" }}>*</span>
                </label>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.trim())}
                    placeholder="请输入收到的验证码"
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
                    placeholder="请设置密码（至少6位）"
                    style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                    }}
                />
            </div>

            {/* 注册按钮 */}
            <button
                onClick={handleRegister}
                style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#1890ff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "16px",
                    cursor: "pointer",
                }}
            >
                完成注册
            </button>

            {/* 已有账号？跳转登录 */}
            <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "14px" }}>
                已有账号？{" "}
                <span
                    onClick={() => navigate("/login")}
                    style={{ color: "#1890ff", cursor: "pointer", textDecoration: "underline" }}
                >
          去登录
        </span>
            </div>
        </div>
    );
};

export default Register;