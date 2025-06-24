import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';

class FilesystemMCPServer {
  constructor() {
    this.server = new Server({
      name: 'filesystem-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_file',
          description: 'Create a new file with content',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'read_file',
          description: 'Read file content',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' }
            },
            required: ['path']
          }
        },
        {
          name: 'edit_file',
          description: 'Edit file content',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'New content' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'delete_file',
          description: 'Delete a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' }
            },
            required: ['path']
          }
        },
        {
          name: 'list_files',
          description: 'List files in directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path' }
            },
            required: ['path']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_file':
            return await this.createFile(args.path, args.content);
          case 'read_file':
            return await this.readFile(args.path);
          case 'edit_file':
            return await this.editFile(args.path, args.content);
          case 'delete_file':
            return await this.deleteFile(args.path);
          case 'list_files':
            return await this.listFiles(args.path);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  async createFile(filePath, content) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    return {
      content: [{ type: 'text', text: `File created: ${filePath}` }]
    };
  }

  async readFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  async editFile(filePath, content) {
    await fs.writeFile(filePath, content);
    return {
      content: [{ type: 'text', text: `File edited: ${filePath}` }]
    };
  }

  async deleteFile(filePath) {
    await fs.remove(filePath);
    return {
      content: [{ type: 'text', text: `File deleted: ${filePath}` }]
    };
  }

  async listFiles(dirPath) {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileList = files.map(f => ({
      name: f.name,
      type: f.isDirectory() ? 'directory' : 'file'
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify(fileList, null, 2) }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP server running on stdio');
  }
}

const server = new FilesystemMCPServer();
server.run().catch(console.error);