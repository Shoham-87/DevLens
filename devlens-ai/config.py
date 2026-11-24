from typing import Annotated

from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode
from pydantic import Field,field_validator

class Setting(BaseSettings):
    database_uri : str
    incoming_database_uri:str
    incoming_db : str = Field(alias="devlens.app.incoming.request.db", default="none")
    model_config = SettingsConfigDict(env_file=(".env", "app.properties"),extra="ignore")
    excluded_dirs: Annotated[set[str], NoDecode] = Field(alias="devlens.app.walker.excluded_dirs")
    allowed_extensions: Annotated[set[str], NoDecode] = Field(alias="devlens.app.walker.allowed_extensions")
    max_file_size:int = Field(alias="devlens.app.walker.max_file_size",default=500)
    jina_api_key : str
    groq_api_key : str
    incoming_db_schema_name : str = Field(alias="devlens.app.incoming.request.schema.name")
    chat_model: str = Field(alias="devlens.app.llm.chat_model", default="openai/gpt-oss-120b")
    router_model: str = Field(alias="devlens.app.llm.router_model", default="openai/gpt-oss-20b")
    overview_model: str = Field(alias="devlens.app.llm.overview_model", default="openai/gpt-oss-120b")
    rerank_enabled: bool = Field(alias="devlens.app.rag.rerank_enabled", default=True)
    max_history_messages: int = Field(alias="devlens.app.rag.max_history_messages", default=10)
    max_context_chars: int = Field(alias="devlens.app.rag.max_context_chars", default=12000)
    max_history_chars: int = Field(alias="devlens.app.rag.max_history_chars", default=3000)
    max_output_tokens: int = Field(alias="devlens.app.llm.max_output_tokens", default=2500)

    @field_validator("excluded_dirs", "allowed_extensions", mode="before")
    @classmethod
    def parse_comma_string_to_set(cls, value):
        if isinstance(value, str):
            return {item.strip() for item in value.split(",") if item.strip()}
        return value

setting = Setting()