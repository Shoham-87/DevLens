from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Setting(BaseSettings):
    database_uri : str
    incoming_database_uri:str
    incoming_db : str = Field(alias="devlens.app.incoming.request.db", default="none")
    model_config = SettingsConfigDict(env_file=(".env", "app.properties"),extra="ignore")

setting = Setting()