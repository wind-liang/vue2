module.exports = {
    // 站点配置
    lang: "zh-CN",
    title: "Vue2剥丝抽茧",
    description: "Vue2剥丝抽茧 by windliang",

    plugins: [
        [
            "vuepress-plugin-baidu-tongji-analytics",
            {
                key: "baef808a4403af4a3001bb28345eaf85",
            },
        ],
        "@renovamen/vuepress-plugin-katex",
    ],
    // 主题和它的配置
    theme: "@qcyblm/vpx",
    themeConfig: {
        search: false,
        lastUpdated: "Last Updated",
        sidebarDepth: 2,
        nav: [
            { text: "Home", link: "/", icon: "fa fa-home" },
            {
                text: "知乎",
                link: "https://www.zhihu.com/people/wang-liang-61-22",
            },
            {
                text: "极客时间优惠",
                link: "https://coursesub.top/",
            },
            { text: "leetcode详细题解", link: "https://leetcode.wang" },
            { text: "windliang博客", link: "https://windliang.wang" },
            {
                text: "前端的设计模式系列",
                link: "https://pattern.windliang.wang/",
            },
        ],
        sidebar: [
            {
                title: "文章全部源码",
                collapsable: false, // 不折叠
                path: "/",
            },
            {
                title: "响应式系统",
                collapsable: false, // 不折叠
                children: [
                    {
                        title: "1.响应式系统",
                        path: "/posts/Vue2剥丝抽茧-响应式系统",
                    },
                    {
                        title: "2.响应式系统之分支切换",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之分支切换",
                    },
                    {
                        title: "3.响应式系统之嵌套",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之嵌套",
                    },
                    {
                        title: "4.响应式系统完善",
                        path: "/posts/Vue2剥丝抽茧-响应式系统完善",
                    },
                    {
                        title: "5.响应式系统之深度响应",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之深度响应",
                    },
                    {
                        title: "6.响应式系统之数组",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之数组",
                    },
                    {
                        title: "7.响应式系统之数组2",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之数组2",
                    },
                    {
                        title: "8.响应式系统之set和delete",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之set和delete",
                    },
                    {
                        title: "9.响应式系统之异步队列",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之异步队列",
                    },
                    {
                        title: "10.响应式系统之nextTick",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之nextTick",
                    },
                    {
                        title: "11.响应式系统之watch",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之watch",
                    },
                    {
                        title: "12.响应式系统之watch2",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之watch2",
                    },
                    {
                        title: "13.响应式系统之computed",
                        path: "/posts/Vue2剥丝抽茧-响应式系统之computed",
                    },
                ],
            },
            {
                title: "虚拟dom",
                collapsable: false, // 不折叠
                children: [
                    {
                        title: "15.虚拟dom",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom简介",
                    },
                    {
                        title: "16.虚拟dom之事件绑定",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom之绑定事件",
                    },
                    {
                        title: "17.虚拟dom之更新",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom之更新",
                    },
                    {
                        title: "18.虚拟dom之移动",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom之移动",
                    },
                    {
                        title: "19.虚拟dom之移动优化",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom之移动优化",
                    },
                    {
                        title: "20.虚拟dom之增删",
                        path: "/posts/Vue2剥丝抽茧-虚拟dom之增删",
                    },
                ],
            },
            {
                title: "从零手写Vue",
                collapsable: false, // 不折叠
                children: [
                    {
                        title: "14.响应式系统-VueLiang0",
                        path: "/posts/Vue2剥丝抽茧-VueLiang0",
                    },
                    {
                        title: "21.虚拟dom-VueLiang1",
                        path: "/posts/Vue2剥丝抽茧-VueLiang1",
                    },
                ],
            },
        ],
        footer: {
            // 页脚信息
            createYear: "2022", // 创建年份 (可选，author、authorLink 启动时必选)
            author: "windliang", // 作者 (可选)
            authorLink: "https://windliang.wang", // 作者链接 (可选)
            beianLink: "https://beian.miit.gov.cn/", // 备案链接 (可选)
            beian: "沪ICP备2021019937号-1", // ICP 备号
        },
        repo: {
            platform: "https://github.com/", // 填写 Git 服务商链接
            icon: "fab fa-github", // 填写 icon 图标 (可选)
            label: "github",
            owner: "wind-liang", //  填写 Git 项目仓库所有者
            repositories: "vue2", // 填写 Git 项目仓库
        },
    },
};
