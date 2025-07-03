<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>SQLite Schema Viewer</h1>
        <p>Load a local SQLite database file to view its table schemas</p>
      </el-header>
      
      <el-main>
        <!-- File Upload Section -->
        <el-card class="upload-card" v-if="!database">
          <template #header>
            <div class="card-header">
              <span>Select SQLite Database File</span>
            </div>
          </template>
          
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept=".db,.sqlite,.sqlite3"
            :on-change="handleFileSelect"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              Drop SQLite file here or <em>click to upload</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                Supported formats: .db, .sqlite, .sqlite3
              </div>
            </template>
          </el-upload>
        </el-card>

        <!-- Database Info Section -->
        <div v-if="database">
          <el-row :gutter="20">
            <el-col :span="24">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>Database: {{ fileName }}</span>
                    <el-button type="primary" @click="resetDatabase">Load Another File</el-button>
                  </div>
                </template>
                
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="File Name">{{ fileName }}</el-descriptions-item>
                  <el-descriptions-item label="File Size">{{ formatFileSize(fileSize) }}</el-descriptions-item>
                  <el-descriptions-item label="Total Tables">{{ tables.length }}</el-descriptions-item>
                  <el-descriptions-item label="Status">
                    <el-tag type="success">Loaded Successfully</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </el-col>
          </el-row>

          <!-- Tables Section -->
          <el-row :gutter="20" style="margin-top: 20px;">
            <el-col :span="24">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>Table Schemas</span>
                  </div>
                </template>
                
                <el-collapse v-model="activeNames" accordion>
                  <el-collapse-item 
                    v-for="table in tables" 
                    :key="table.name" 
                    :title="`${table.name} (${table.columns.length} columns)`"
                    :name="table.name"
                  >
                    <el-table :data="table.columns" style="width: 100%">
                      <el-table-column prop="name" label="Column Name" width="200" />
                      <el-table-column prop="type" label="Data Type" width="150" />
                      <el-table-column prop="notnull" label="Not Null" width="100">
                        <template #default="scope">
                          <el-tag :type="scope.row.notnull ? 'danger' : 'info'" size="small">
                            {{ scope.row.notnull ? 'Yes' : 'No' }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="pk" label="Primary Key" width="120">
                        <template #default="scope">
                          <el-tag v-if="scope.row.pk" type="warning" size="small">
                            PK
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="dflt_value" label="Default Value">
                        <template #default="scope">
                          <code v-if="scope.row.dflt_value !== null">{{ scope.row.dflt_value }}</code>
                          <span v-else class="text-muted">NULL</span>
                        </template>
                      </el-table-column>
                    </el-table>
                    
                    <!-- Show CREATE TABLE statement -->
                    <el-divider content-position="left">CREATE TABLE Statement</el-divider>
                    <el-input
                      v-model="table.createStatement"
                      type="textarea"
                      :rows="6"
                      readonly
                      class="create-statement"
                    />
                  </el-collapse-item>
                </el-collapse>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    UploadFilled
  },
  setup() {
    const database = ref(null)
    const fileName = ref('')
    const fileSize = ref(0)
    const tables = ref([])
    const activeNames = ref([])
    const SQL = ref(null)

    // Initialize SQL.js
    onMounted(async () => {
      try {
        // Wait for SQL.js to be available from the public folder
        if (typeof window.initSqlJs !== 'undefined') {
          SQL.value = await window.initSqlJs({
            locateFile: file => `/${file}`
          })
        } else {
          // Fallback: wait a bit and try again
          setTimeout(async () => {
            if (typeof window.initSqlJs !== 'undefined') {
              SQL.value = await window.initSqlJs({
                locateFile: file => `/${file}`
              })
            } else {
              throw new Error('SQL.js not loaded')
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error)
        ElMessage.error('Failed to initialize SQL.js library')
      }
    })

    const handleFileSelect = async (file) => {
      if (!SQL.value) {
        ElMessage.error('SQL.js is not initialized yet')
        return
      }

      try {
        const arrayBuffer = await file.raw.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Create database instance
        database.value = new SQL.value.Database(uint8Array)
        fileName.value = file.name
        fileSize.value = file.size
        
        // Load table schemas
        await loadTableSchemas()
        
        ElMessage.success('Database loaded successfully!')
      } catch (error) {
        console.error('Error loading database:', error)
        ElMessage.error('Failed to load database file. Please ensure it\'s a valid SQLite file.')
      }
    }

    const loadTableSchemas = async () => {
      if (!database.value) return

      try {
        // Get all table names
        const tableQuery = `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `
        const tableResult = database.value.exec(tableQuery)
        
        if (tableResult.length === 0) {
          tables.value = []
          return
        }

        const tableNames = tableResult[0].values.map(row => row[0])
        const tableSchemas = []

        // Get schema for each table
        for (const tableName of tableNames) {
          // Get column information
          const columnQuery = `PRAGMA table_info(${tableName})`
          const columnResult = database.value.exec(columnQuery)
          
          // Get CREATE TABLE statement
          const createQuery = `
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name='${tableName}'
          `
          const createResult = database.value.exec(createQuery)
          
          const columns = columnResult[0]?.values.map(row => ({
            cid: row[0],
            name: row[1],
            type: row[2],
            notnull: Boolean(row[3]),
            dflt_value: row[4],
            pk: Boolean(row[5])
          })) || []

          tableSchemas.push({
            name: tableName,
            columns: columns,
            createStatement: createResult[0]?.values[0]?.[0] || ''
          })
        }

        tables.value = tableSchemas
      } catch (error) {
        console.error('Error loading table schemas:', error)
        ElMessage.error('Failed to load table schemas')
      }
    }

    const resetDatabase = () => {
      if (database.value) {
        database.value.close()
      }
      database.value = null
      fileName.value = ''
      fileSize.value = 0
      tables.value = []
      activeNames.value = []
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return {
      database,
      fileName,
      fileSize,
      tables,
      activeNames,
      handleFileSelect,
      resetDatabase,
      formatFileSize
    }
  }
}
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-header {
  background-color: #545c64;
  color: #fff;
  text-align: center;
  line-height: 60px;
  padding: 20px;
}

.el-header h1 {
  margin: 0;
  font-size: 2em;
}

.el-header p {
  margin: 10px 0 0 0;
  opacity: 0.8;
}

.upload-card {
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-demo {
  width: 100%;
}

.create-statement {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.text-muted {
  color: #909399;
  font-style: italic;
}

.el-main {
  padding: 20px;
}

.el-collapse {
  border: none;
}

.el-table {
  margin-bottom: 20px;
}
</style>
