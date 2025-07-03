<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>Amazon Q CLI History Inspector</h1>
        <p>Load Amazon Q Developer CLI database file to view conversation history</p>
      </el-header>
      
      <el-main>
        <!-- File Upload Section -->
        <el-card class="upload-card" v-if="!database">
          <template #header>
            <div class="card-header">
              <span>Select Amazon Q CLI Database File</span>
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
              Drop Amazon Q CLI database file here or <em>click to upload</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                <p><strong>Database Location Tips:</strong></p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li><strong>Linux:</strong> <code>$HOME/.local/share/amazon-q/data.sqlite3</code></li>
                  <li><strong>macOS:</strong> <code>$HOME/Library/Application Support/amazon-q/data.sqlite3</code></li>
                </ul>
                <p style="font-size: 12px; margin-top: 10px;">
                  Supported formats: .db, .sqlite, .sqlite3
                </p>
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
                  <el-descriptions-item label="Total Conversations">{{ conversations.length }}</el-descriptions-item>
                  <el-descriptions-item label="Status">
                    <el-tag type="success">Loaded Successfully</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </el-col>
          </el-row>

          <!-- Conversations Section -->
          <el-row :gutter="20" style="margin-top: 20px;">
            <el-col :span="24">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>Conversation History</span>
                  </div>
                </template>
                
                <div v-if="conversations.length === 0" class="no-data">
                  <el-empty description="No conversations found in this database" />
                </div>
                
                <el-table v-else :data="conversations" style="width: 100%" max-height="600">
                  <el-table-column type="index" label="#" width="60" />
                  <el-table-column prop="key" label="Conversation Path" min-width="300">
                    <template #default="scope">
                      <el-text class="conversation-path">{{ scope.row.key }}</el-text>
                    </template>
                  </el-table-column>
                  <el-table-column label="Actions" width="120">
                    <template #default="scope">
                      <el-button 
                        size="small" 
                        @click="toggleConversationDetails(scope.row)"
                        :type="scope.row.expanded ? 'danger' : 'primary'"
                      >
                        {{ scope.row.expanded ? 'Hide' : 'View' }}
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                
                <!-- Conversation Details -->
                <div v-for="conversation in conversations" :key="conversation.id">
                  <el-card v-if="conversation.expanded" class="conversation-detail" style="margin-top: 20px;">
                    <template #header>
                      <div class="card-header">
                        <span>{{ conversation.key }}</span>
                        <div>
                          <el-button 
                            size="small" 
                            type="success" 
                            @click="downloadConversationJson(conversation)"
                            style="margin-right: 10px;"
                          >
                            Download JSON
                          </el-button>
                          <el-button size="small" @click="conversation.expanded = false">Close</el-button>
                        </div>
                      </div>
                    </template>
                    
                    <el-input
                      v-model="conversation.value"
                      type="textarea"
                      :rows="20"
                      readonly
                      class="conversation-content"
                    />
                  </el-card>
                </div>
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
    const conversations = ref([])
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
        
        // Load conversations
        await loadConversations()
        
        ElMessage.success('Amazon Q CLI database loaded successfully!')
      } catch (error) {
        console.error('Error loading database:', error)
        if (error.message.includes('malformed')) {
          ElMessage.error('Database file appears to be corrupted or locked. Try closing Amazon Q CLI completely and copying the file to a different location first.')
        } else {
          ElMessage.error('Failed to load database file: ' + error.message)
        }
      }
    }

    const loadConversations = async () => {
      if (!database.value) return

      try {
        // First, let's see what tables exist
        console.log('Checking database structure...')
        const tablesQuery = `SELECT name FROM sqlite_master WHERE type='table'`
        const tablesResult = database.value.exec(tablesQuery)
        
        const tableNames = tablesResult.length > 0 
          ? tablesResult[0].values.map(row => row[0])
          : []
        
        console.log('Available tables:', tableNames)
        
        if (!tableNames.includes('conversations')) {
          ElMessage.warning(`No 'conversations' table found. Available tables: ${tableNames.join(', ') || 'none'}`)
          conversations.value = []
          return
        }

        // Check the structure of conversations table
        console.log('Checking conversations table structure...')
        const structureQuery = `PRAGMA table_info(conversations)`
        const structureResult = database.value.exec(structureQuery)
        
        const columns = structureResult.length > 0 
          ? structureResult[0].values.map(row => ({ name: row[1], type: row[2] }))
          : []
        
        console.log('Conversations table columns:', columns)

        // Try to count rows first
        console.log('Counting conversations...')
        const countQuery = `SELECT COUNT(*) FROM conversations`
        const countResult = database.value.exec(countQuery)
        const rowCount = countResult.length > 0 ? countResult[0].values[0][0] : 0
        
        console.log('Total conversations:', rowCount)

        if (rowCount === 0) {
          ElMessage.info('No conversations found in the database')
          conversations.value = []
          return
        }

        // Try to get a small sample first
        console.log('Getting sample conversations...')
        const sampleQuery = `SELECT key, value FROM conversations LIMIT 5`
        const sampleResult = database.value.exec(sampleQuery)
        
        if (sampleResult.length > 0) {
          console.log('Sample data retrieved successfully, getting all conversations...')
          
          // Try without ORDER BY first to see if sorting is the issue
          const conversationsQuery = `SELECT key, value FROM conversations`
          const result = database.value.exec(conversationsQuery)
          
          if (result.length > 0 && result[0].values) {
            // Transform the data and sort in JavaScript instead
            const rawData = result[0].values.map((row, index) => ({
              id: index + 1,
              key: row[0] || '', // handle null keys
              value: row[1] || '', // handle null values
              expanded: false
            }))
            
            // Sort in JavaScript to avoid SQL sorting issues
            conversations.value = rawData.sort((a, b) => {
              if (a.key < b.key) return -1
              if (a.key > b.key) return 1
              return 0
            })

            console.log(`Successfully loaded ${conversations.value.length} conversations`)
          } else {
            conversations.value = []
          }
        }

      } catch (error) {
        console.error('Error loading conversations:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
        
        if (error.message.includes('malformed')) {
          ElMessage.error('Database appears to be corrupted. The file may be damaged or not a valid SQLite database.')
        } else {
          ElMessage.error('Failed to load conversation history: ' + error.message)
        }
      }
    }

    const downloadConversationJson = (conversation) => {
      try {
        // Create a blob with the JSON content
        const jsonContent = conversation.value
        const blob = new Blob([jsonContent], { type: 'application/json' })
        
        // Create a download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // Generate filename from conversation key (remove path separators and add timestamp)
        const safeName = conversation.key
          .replace(/[/\\:*?"<>|]/g, '_') // Replace invalid filename characters
          .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
        link.download = `conversation_${safeName}_${timestamp}.json`
        
        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the URL object
        URL.revokeObjectURL(url)
        
        ElMessage.success('Conversation JSON downloaded successfully!')
      } catch (error) {
        console.error('Error downloading conversation:', error)
        ElMessage.error('Failed to download conversation JSON')
      }
    }

    const toggleConversationDetails = (conversation) => {
      conversation.expanded = !conversation.expanded
    }

    const resetDatabase = () => {
      if (database.value) {
        database.value.close()
      }
      database.value = null
      fileName.value = ''
      fileSize.value = 0
      conversations.value = []
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
      conversations,
      activeNames,
      handleFileSelect,
      toggleConversationDetails,
      downloadConversationJson,
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-weight: bold;
  flex: 1;
  margin-right: 10px;
  word-break: break-all;
}

.el-upload__tip {
  color: #606266;
  font-size: 14px;
  margin-top: 15px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.el-upload__tip ul {
  margin: 8px 0;
  padding-left: 20px;
}

.el-upload__tip li {
  margin: 5px 0;
  list-style-type: disc;
}

.el-upload__tip code {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #e6a23c;
}

.conversation-path {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}

.conversation-content {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.conversation-detail {
  border-left: 4px solid #409eff;
}

.no-data {
  text-align: center;
  padding: 40px;
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
