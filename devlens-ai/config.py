from pydantic_settings import BaseSettings, SettingsConfigDict

class Setting(BaseSettings):
    database_url : str
    model_config = SettingsConfigDict(env_file=".env")

setting = Setting()