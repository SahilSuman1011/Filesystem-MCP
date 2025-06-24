// Simplified MCP client for browser environment
class MCPFilesystemClient {
  constructor() {
    this.isConnected = false;
    this.files = new Map(); // In-memory storage for demo
  }

  async connect() {
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.isConnected = true;
      console.log('Connected to MCP server (simulated)');
      return true;
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async createFile(path, content) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    this.files.set(path, content);
    return {
      content: [{ type: 'text', text: `File created: ${path}` }]
    };
  }

  async readFile(path) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }

    return {
      content: [{ type: 'text', text: content }]
    };
  }

  async editFile(path, content) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }

    this.files.set(path, content);
    return {
      content: [{ type: 'text', text: `File edited: ${path}` }]
    };
  }

  async deleteFile(path) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }

    this.files.delete(path);
    return {
      content: [{ type: 'text', text: `File deleted: ${path}` }]
    };
  }

  async listFiles(basePath) {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server');
    }

    const fileList = [];
    for (const [path] of this.files) {
      if (path.startsWith(basePath)) {
        const fileName = path.replace(basePath + '/', '');
        if (!fileName.includes('/')) { // Only direct children
          fileList.push({
            name: fileName,
            type: 'file'
          });
        }
      }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(fileList, null, 2) }]
    };
  }

  disconnect() {
    this.isConnected = false;
  }
}

export default MCPFilesystemClient;