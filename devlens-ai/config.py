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

    @field_validator("excluded_dirs", "allowed_extensions", mode="before")
    @classmethod
    def parse_comma_string_to_set(cls, value):
        if isinstance(value, str):
            return {item.strip() for item in value.split(",") if item.strip()}
        return value

setting = Setting()