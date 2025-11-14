<template>
  <div class="admin-layout">
    <div class="admin-layout__inner">
      <slot />
    </div>
  </div>
</template>

<script setup>
// Bu layout admin sayfaları için standart yatay/dikey boşluk yönetimini sağlar.
</script>

<style scoped>
.admin-layout {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-inline: var(--admin-layout-padding-inline);
  padding-block: var(--admin-layout-padding-block);
}

.admin-layout__inner {
  width: 100%;
  max-width: var(--admin-layout-max-width);
  margin: 0 auto;
}

:deep(.page-content),
:deep(.admin-page-content) {
  margin: 0;
  padding: 0;
}

:deep(.page-header) {
  margin-top: 0;
}

@media (max-width: 1200px) {
  .admin-layout {
    padding-inline: var(--admin-layout-padding-inline-md);
    padding-block: var(--admin-layout-padding-block-md);
  }
}

@media (max-width: 768px) {
  .admin-layout {
    padding-inline: var(--admin-layout-padding-inline-sm);
    padding-block: var(--admin-layout-padding-block-sm);
  }
}
</style>
