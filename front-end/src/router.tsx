// src/router.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Register from "./pages/Register";
import Login from "./pages/Login"

// 定义路由规则
const router = createBrowserRouter([
    {
        path: "/", // 根路径
        element: <App />, // 对应App组件（可在App中放首页内容或导航）
    },
    {
        path: "/register", // 注册页路径（访问时用这个URL）
        element: <Register />, // 对应Register组件
    },
    {
        path: "/login",
        element: <Login />,
    },
]);

// 路由提供者组件，供index.tsx使用
export const AppRouter = () => {
    return <RouterProvider router={router} />;
};