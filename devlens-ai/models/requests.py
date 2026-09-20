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
