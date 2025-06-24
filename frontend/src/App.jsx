import { useState, useEffect } from 'react';
import MCPFilesystemClient from './mcpClient';

function App() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [workingDir, setWorkingDir] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    initClient();
    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const initClient = async () => {
    try {
      const mcpClient = new MCPFilesystemClient();
      await mcpClient.connect();
      setClient(mcpClient);
      setConnected(true);
      setMessage('Connected to MCP server (browser mode)');
    } catch (error) {
      setMessage(`Failed to connect: ${error.message}`);
    }
  };

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const basePath = files[0].webkitRelativePath.split('/')[0];
    setWorkingDir(basePath);
    
    try {
      setLoading(true);
      for (const file of files) {
        const content = await file.text();
        await client.createFile(file.webkitRelativePath, content);
      }
      await refreshFiles();
      setMessage(`Uploaded ${files.length} files to ${basePath}`);
    } catch (error) {
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshFiles = async () => {
    if (!workingDir) return;
    
    try {
      const result = await client.listFiles(workingDir);
      const fileList = JSON.parse(result.content[0].text);
      setFiles(fileList);
    } catch (error) {
      setMessage(`Failed to list files: ${error.message}`);
    }
  };

  const handleFileSelect = async (fileName) => {
    try {
      setLoading(true);
      const filePath = `${workingDir}/${fileName}`;
      const result = await client.readFile(filePath);
      setFileContent(result.content[0].text);
      setSelectedFile(fileName);
    } catch (error) {
      setMessage(`Failed to read file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executePrompt = async () => {
    if (!prompt.trim() || !selectedFile) return;

    try {
      setLoading(true);
      const filePath = `${workingDir}/${selectedFile}`;
      
      // Simple prompt processing - in real app, you'd use AI/LLM
      let newContent = fileContent;
      
      if (prompt.includes('add') && prompt.includes('comment')) {
        newContent = `// ${prompt}\n${fileContent}`;
      } else if (prompt.includes('replace')) {
        const parts = prompt.split('replace ')[1]?.split(' with ');
        if (parts && parts.length === 2) {
          newContent = fileContent.replace(parts[0], parts[1]);
        }
      } else if (prompt.includes('delete line')) {
        const lines = fileContent.split('\n');
        const lineNum = parseInt(prompt.match(/\d+/)?.[0]);
        if (lineNum && lineNum <= lines.length) {
          lines.splice(lineNum - 1, 1);
          newContent = lines.join('\n');
        }
      }

      await client.editFile(filePath, newContent);
      setFileContent(newContent);
      setMessage(`Applied: ${prompt}`);
      setPrompt('');
    } catch (error) {
      setMessage(`Failed to execute prompt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileName) => {
    try {
      setLoading(true);
      const filePath = `${workingDir}/${fileName}`;
      await client.deleteFile(filePath);
      await refreshFiles();
      if (selectedFile === fileName) {
        setSelectedFile(null);
        setFileContent('');
      }
      setMessage(`Deleted: ${fileName}`);
    } catch (error) {
      setMessage(`Failed to delete file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to MCP server...</p>
          {message && <p className="mt-2 text-red-500">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Filesystems Operation MCP</h1>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Folder</h2>
            <input
              type="file"
              webkitdirectory=""
              multiple
              onChange={handleFolderUpload}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={loading}
            />
            {workingDir && (
              <p className="mt-2 text-sm text-gray-600">Working in: {workingDir}</p>
            )}
          </div>

          {/* Files List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Files</h2>
              <button
                onClick={refreshFiles}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                disabled={loading || !workingDir}
              >
                Refresh
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <button
                    onClick={() => handleFileSelect(file.name)}
                    className={`flex-1 text-left ${
                      selectedFile === file.name ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                    disabled={file.type === 'directory'}
                  >
                    {file.type === 'directory' ? '📁' : '📄'} {file.name}
                  </button>
                  {file.type === 'file' && (
                    <button
                      onClick={() => deleteFile(file.name)}
                      className="ml-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedFile ? `Editing: ${selectedFile}` : 'Select a file'}
            </h2>
            
            {selectedFile && (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter edit prompt (e.g., 'add comment', 'replace old with new')"
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                    disabled={loading}
                  />
                  <button
                    onClick={executePrompt}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading || !prompt.trim()}
                  >
                    {loading ? 'Processing...' : 'Execute'}
                  </button>
                </div>
                
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm"
                  placeholder="File content will appear here..."
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;