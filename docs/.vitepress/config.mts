import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'

const isGithubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  title: 'SEO Intelligence',
  description: '內部連結規劃工具文件',
  base: isGithubPages ? '/seo-intelligence/docs/' : '/',
  lang: 'zh-TW',
  head: [
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
      },
    ],
  ],
  markdown: {
    config: (md) => {
      md.use(katex)
    },
  },
  themeConfig: {
    logoLink: '/features',
    nav: [
      { text: 'Web', link: 'https://leochiu-a.github.io/seo-intelligence/' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/leochiu-a/seo-intelligence' },
    ],
    sidebar: [
      {
        text: '文件',
        items: [
          { text: '核心功能', link: '/features' },
          { text: 'SEO 觀念與演算法', link: '/seo-concepts' },
          { text: 'Score 計算流程說明', link: '/score-algorithm' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
  },
})
