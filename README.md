# typst-flow

**typst-flow** is a self-hostable service designed to ultimately provide a collaborative Typst writing experience, much like [typst.app](https://typst.app). This platform enables users to collaboratively create, edit, and preview Typst documents in real-time. Name originates from my feeling when I write with Typst, it feels like a flow - I love it.

---

## Features (All pretty much WIP)

- **Live Preview**: See your Typst document rendered in real-time as you edit.
- **Self-Hostable**: Full control over your instance, ensuring privacy and customization.
- **User Management**: Manage access through user accounts or external authentication.
- **Collaborative Editing**: Multiple users can edit the same document simultaneously.
- **Export Options**: Generate and download Typst documents as PDFs or source files.

### Planned

- **Version Control**: Integrated history to track changes.

---

## Installation

### Prerequisites
- **Server Requirements**:  
  - Operating System: Linux (recommended), macOS, or Windows  
  - RAM: Minimum 2 GB  
  - Disk Space: At least 500 MB for the application, plus storage for documents
- **Software Requirements**:  
  - Docker

### Steps
1. Clone the repository:  
   ```bash
   git clone https://github.com/LeqitDev/typst-flow.git
   cd typst-flow
    ```

---

## Whats inside

- **Frontend**: Svelte, shadcn-svelte, tailwindcss
- **Backend**: SvelteKit
- **Auth**: Lucia
- **Database**: Postgres (for managing users, sessions, teams, and projects)
- **S3 Storage**: Minio (for storing Typst documents)
- **Collaborative Editing**: [Typst Flower](https://github.com/LeqitDev/typst-flower) (Custom Operational Transformation implementation)
- **Typst**: Through a custom wasm package [Typst Flow Wasm](https://github.com/LeqitDev/typst-flow-wasm)

---

## Contributing

Contributions are welcome! Here are some ways you can help:

- **Bug Reports**: Report any bugs you encounter through the Issues tab.
- **Feature Requests**: Suggest new features or improvements.
- **Code Contributions**: Submit a pull request with your changes.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- **Typst**: Without the absolutely insane [Typst Project](https://github.com/typst/typst), all of this would not be possible.
- **Inspirations**: [obsidian-typst](https://github.com/fenjalien/obsidian-typst), [typst-lsp](https://github.com/nvarner/typst-lsp) bzw. [tinymist](https://github.com/Myriad-Dreamin/tinymist), [typst.ts](https://github.com/Myriad-Dreamin/typst.ts)
- **caleb1248**: That [repo](https://github.com/caleb1248/monaco-vscode-textmate) helped me a lot with the Monaco Editor integration.