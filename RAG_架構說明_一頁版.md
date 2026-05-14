# RAG 架構說明（一頁版）

## 1. 什麼是 RAG
RAG（Retrieval-Augmented Generation）可拆成兩段：**先找資料，再生成答案**。它不是只靠 LLM 記憶作答，而是先把外部文件做成可搜尋的索引；當使用者提問時，系統先找出最相關片段，再把這些片段連同問題一起送進 LLM 產生回答。LangChain 官方文件將流程分成 **Indexing** 與 **Retrieval and generation** 兩部分。[1]

## 2. 核心流程
**文件 → Chunking → Embedding → Vector DB → Retrieval → LLM Answer**

- **Chunking**：把長文件切成較小片段，因為太長的文字不易搜尋，也塞不進模型的 context window。[1]
- **Embedding**：把每段文字轉成向量，讓「語意相近」的內容在向量空間中彼此接近。
- **Vector DB**：儲存這些向量，並支援相似度搜尋。LangChain 將 vector store 抽象成統一介面，常見操作包含 `addDocuments`、`delete`、`similaritySearch`。[2]
- **Retrieval**：把使用者問題也轉成向量，從資料庫中找出最相關的 chunks。
- **Generation**：LLM 根據「問題 + 檢索到的內容」生成答案，而不是憑空回答。[1]

## 3. LangChain 與 LlamaIndex 在 RAG 中的角色
- **LangChain**：偏向「流程編排」。官方文件把 RAG 分成 **RAG agent** 與 **two-step RAG chain**；前者較彈性，後者延遲較低。[1]
- **LlamaIndex**：偏向「資料索引與查詢」。官方文件指出 **VectorStoreIndex** 是 RAG 的關鍵元件；文件先轉成 nodes，再建立索引。[3]
- 在 LlamaIndex 中，**Retriever** 負責抓出最相關 context，**Query Engine** 則負責把自然語言查詢轉成完整回答。[4][5]

## 4. 一句話理解整體架構
RAG 的本質就是：**先用 Embedding + Vector DB 找證據，再用 LLM 根據證據回答問題**。因此，回答品質通常不只取決於模型本身，更取決於 **切塊方式、向量品質、檢索策略** 是否設計得好。

## 參考文獻
1. LangChain, *Build a RAG agent with LangChain*.(https://docs.langchain.com/oss/python/langchain/rag)
2. LangChain, *Vector store integrations*. (https://docs.langchain.com/oss/python/integrations/vectorstores)
3. LlamaIndex, *Using VectorStoreIndex*. (https://developers.llamaindex.ai/python/framework/module_guides/indexing/vector_store_index/?utm_source=chatgpt.com)
4. LlamaIndex, *Retriever*. (https://developers.llamaindex.ai/python/framework/module_guides/querying/retriever/)
5. LlamaIndex, *Query Engine*. (https://developers.llamaindex.ai/python/framework/module_guides/deploying/query_engine/)
