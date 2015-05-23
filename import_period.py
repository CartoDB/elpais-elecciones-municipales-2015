# coding=utf-8
from datetime import datetime, timedelta
import sys
import time
from powertrack.api import *
from cartodb import CartoDBAPIKey, CartoDBException


p = PowerTrack(api="search")

categories = []
categories.append(["#trabajarhacercrecer",
"#votapp",
"@PPopular",
"Mariano Rajoy",
"@marianorajoy",
"@Sorayapp",
"Esperanza Aguirre",
"@EsperanzAguirre",
"Cristina Cifuentes",
"@ccifuentes",
"@CCifuentes2015",
"@AliciaSCamacho",
"Rita Barbera",
"@ritabarbera",
"Alberto Fabra",
"@AlbertoFabra",
"@gonzalezpons",
"M. Dolores Cospedal",
"@mdcospedal",
"J. Ignacio Zoido",
"@zoidoalcalde",
"@pablocasado_",
"Borja Semper",
"@bsemper",
"Luisa Fernanda Rudi",
"@LFRudi",
"@JRBauza",
"@JuanMa_Moreno"])

categories.append(["#yovotopsoe",
"#gobernarparalamayoría",
"@PSOE",
"Pedro Sánchez",
"Pedro Sanchez",
"@sanchezcastejon",
"Antonio M. Carmona",
"@AntonioMiguelC",
"Ángel Gabilondo",
"#Angelgabilondo",
"@equipoGabilondo",
"#solucionesjustas",
"@JoseantonioJun",
"@carmechacon",
"@BeatrizTalegon",
"@JuanEspadasSVQ",
"@Pedro_Zerolo",
"@EduMadina",
"@_Rubalcaba_",
"@ximopuig",
"Patxi Lopez",
"@patxilopez",
"@GFVara",
"@garciapage",
"@jaumecollboni",
"@javier_asturias",
"Susana Diaz",
"@_susanadiaz"])

categories.append(["#hagamoshistoria24m",
"@ahorapodemos",
"Pablo Iglesias",
"@Pablo_Iglesias_",
"Iñigo Errejón",
"@ierrejon",
"Manuela Carmena",
"@ManuelaCarmena",
"José Manuel López",
"@JoseManuel_Lop",
"Teresa Rodríguez",
"@TeresaRodr_",
"Carolina Bescansa",
"@CBescansa",
"Pablo Echenique",
"@pnique",
"@podemoszaragoza",
"Juan Carlos Monedero",
"@MonederoJC",
"Tania Sánchez",
"@Ainhat",
"Ahora Madrid",
"@AhoraMadrid",
"#ahoranosotras",
"#somosmanuela"])

categories.append(["#barcelonanaranja",
"#elcambiocs",
"#VotaCs",
"#ElCAMBIOSensato",
"#EspanaPideCambio",
"@CiudadanosCs",
"Albert Rivera",
"@Albert_Rivera",
"Ignacio Aguado",
"@ignacioaguado",
"Begoña Villacís",
"@begonavillacis",
"Carolina Punset",
"@CarolinaPunset",
"Inés Arrimadas",
"@InesArrimadas",
"Luis Garicano",
"@lugaricano",
"Carina Mejias"])

categories.append(["#estiempode",
"@iunida",
"#VotaIU",
"#EsTiempoDeIzquierda",
"Cayo Lara",
"@cayo_lara",
"Alberto Garzón",
"@agarzon",
"Gaspar Llamazares",
"@GLlamazares",
"Luis García Montero",
"@lgm_com",
"Raquel Lopez",
"@RaquelLopezIU"])

categories.append(["libres",
"#libres",
"#VotaUPYD",
"#YoVotoUPyD",
"@UPyD",
"Rosa Díez",
"@rosadiezupyd",
"Irene Lozano",
"@lozanoirene",
"Toni Cantó",
"@Tonicanto1",
"David Ortega",
"@davidortegaUPyD"])


# Get tweets from GNIP

new_file = True

with open("period.conf", "r") as conf:
    conf = json.loads(conf.read())
    current_cartodb_id = conf["next_cartodb_id"]
    start_timestamp = datetime.strptime(conf["start_timestamp"], "%Y%m%d%H%M%S")

end_timestamp = datetime.now() - timedelta(hours=2)  # GMT

print current_cartodb_id, start_timestamp,end_timestamp

next_cartodb_id = current_cartodb_id
for i, category in enumerate(categories):
    new_job = p.jobs.create(start_timestamp, end_timestamp, "period", category)
    next_cartodb_id += new_job.export_tweets(category=i + 1, append=False if new_file and i == 0 else True)

with open("period.conf", "w") as conf:
    conf.write(json.dumps({"next_cartodb_id": next_cartodb_id, "start_timestamp": end_timestamp.strftime("%Y%m%d%H%M%S")}))


# Now, because we can't use ogr2ogr, here comes the HACK!

# 1) Import file into cartodb.com

IMPORT_API_ENDPOINT = "https://dcarrion.cartodb.com/api/v1/imports/"
API_KEY = ""
files = {'file': open('period.csv', 'rb')}

r = requests.post(IMPORT_API_ENDPOINT, files=files, params={"api_key": API_KEY})
response_data = r.json()
print "SUCCESS", response_data["success"]

state = "uploading"
item_queue_id = response_data["item_queue_id"]
while state != "complete" and state != "failure":
    time.sleep(5)
    r = requests.get(IMPORT_API_ENDPOINT + item_queue_id, params={"api_key": API_KEY})
    response_data = r.json()
    state = response_data["state"]
    print response_data

if state == "failure":
    sys.exit(1)

table_name = response_data["table_name"]
print "TABLE_NAME"

# 2) Append new data from temp table to real table

cl = CartoDBAPIKey(API_KEY, "dcarrion")
try:
    print cl.sql("CREATE SEQUENCE serial_%s START %s" % (current_cartodb_id, current_cartodb_id))
except CartoDBException as e:
    pass

try:
    print cl.sql("INSERT INTO dcarrion.elecciones_partidos (actor_displayname,actor_followerscount,actor_friendscount,"
                 "actor_id,actor_image,actor_languages,actor_link,actor_links,actor_listedcount,actor_location,actor_objecttype,"
                 "actor_postedtime,actor_preferredusername,actor_statusescount,actor_summary,actor_twittertimezone,actor_utcoffset,"
                 "actor_verified,body,category_name,category_terms,favoritescount,generator_displayname,generator_link,geo,gnip,id,"
                 "inreplyto_link,link,location_displayname,location_geo,location_link,location_name,location_objecttype,"
                 "location_streetaddress,object_id,object_link,object_objecttype,object_postedtime,object_summary,object_type,"
                 "postedtime,provider_displayname,provider_link,provider_objecttype,retweetcount,the_geom,twitter_entities,"
                 "twitter_filter_level,twitter_lang,verb,cartodb_id) SELECT actor_displayname,actor_followerscount,actor_friendscount,"
                 "actor_id,actor_image,actor_languages,actor_link,actor_links,actor_listedcount,actor_location,actor_objecttype,"
                 "actor_postedtime,actor_preferredusername,actor_statusescount,actor_summary,actor_twittertimezone,actor_utcoffset,"
                 "actor_verified,body,category_name,category_terms,favoritescount,generator_displayname,generator_link,geo,gnip,id,"
                 "inreplyto_link,link,location_displayname,location_geo,location_link,location_name,location_objecttype,"
                 "location_streetaddress,object_id,object_link,object_objecttype,object_postedtime,object_summary,object_type,"
                 "postedtime,provider_displayname,provider_link,provider_objecttype,retweetcount,the_geom,twitter_entities,"
                 "twitter_filter_level,twitter_lang,verb,nextval('serial_%s') as cartodb_id FROM dcarrion.%s" % (current_cartodb_id, table_name))
except CartoDBException as e:
    print ("some error ocurred", e)
    sys.exit(1)
