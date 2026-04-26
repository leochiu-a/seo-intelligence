---
layout: false
---

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vitepress'
const { go } = useRouter()
onMounted(() => go('/features'))
</script>
