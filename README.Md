# PumAI

LLM- and RAG-powered AI system designed to respond to UNAH student enquiries.

## Overview

PumAI leverages Large Language Models (LLMs) combined with Retrieval-Augmented Generation (RAG) to provide accurate, context-aware responses to student questions related to UNAH. The system is designed to be extensible, maintainable, and documentation-first.

## Features

- LLM-based natural language responses  
- RAG pipeline for grounded, up-to-date answers  
- Documentation-driven development using MkDocs  
- Modular architecture (see `docs/` for details)

## Documentation

All technical and usage documentation lives in the `docs/` folder and is built using **MkDocs**.

### View the documentation locally

1. Install MkDocs (preferably in a virtual environment):
   ```bash
   pip install mkdocs
````

2. From the project root, start the documentation server:

   ```bash
   mkdocs serve
   ```

3. Open your browser and navigate to:

   ```
   http://127.0.0.1:8000/
   ```

Any changes made in the `docs/` folder will hot-reload automatically.

## Project Structure

```
.
├── docs/          # MkDocs documentation source
├── mkdocs.yml     # MkDocs configuration
├── README.md
└── ...
```

## Author

**Fernando Rivera**

* GitHub: [https://github.com/Asterki](https://github.com/Asterki)
* Website: [https://asterki.xyz](https://asterki.xyz)
* Email: [asterki.dev@proton.me](mailto:asterki.dev@proton.me)

## License

