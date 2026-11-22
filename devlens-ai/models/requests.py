from pydantic import BaseModel,field_validator

class IngestRequest(BaseModel):
    connectedRepoId: str
    repoUrl:str
    githubAccessToken:str
    repoName:str

    @field_validator('connectedRepoId')
    @classmethod
    def mandatory_non_empty(cls,v):
        if not v.strip():
            raise ValueError('connectedRepoId cannot be empty')
        return v

class ChatRequest(BaseModel):
    connectedRepoId: str
    question: str
    conversationHistory: list[dict] = []

    @field_validator('question')
    @classmethod
    def question_not_empty(cls, v):
        if not v.strip():
            raise ValueError('question cannot be empty')
        return v
