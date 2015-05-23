import ConfigParser
import csv
import logging
import os
import sys
import requests

from powertrack.csv_helper import tweet2csv


config = ConfigParser.RawConfigParser()
config.read("powertrack.conf")


class Job(object):
    data_url = None

    def __init__(self, pt, title, job_data, orig_query=None):
        """
        Job constructor
        :param pt: Powertrack instance
        :param title: Title for the job, used as a file name
        :param job_data: Dictionary with parameters for the GNIP request
        :return:
        """
        self.pt = pt
        self.file_name = os.path.join(config.get('output', 'folder'), "{filename}.csv".format(filename=title))
        self.request_data = job_data
        self.orig_query = orig_query
        self.data_url = "search/{label}.json".format(label=config.get('credentials', 'label'))

    def export_tweets(self, category=None, append=False):
        """
        Gets data from GNIP and generates CSV file
        """
        next_page = True

        count = 0

        sys.stdout.write("Building CSV file {file_name}.\n".format(file_name=self.file_name))

        if append is True:
            csv_file = open(self.file_name, 'a')
        else:
            csv_file = open(self.file_name, 'w')
        csv_writer = csv.writer(csv_file)
        if append is False:
            csv_writer.writerow(tweet2csv(category_name=category))  # Header row

        while next_page:
            if next_page is not True:
                self.request_data.update({"next": next_page})

            r = self.pt.post(self.data_url, self.request_data)

            if r.status_code != requests.codes.ok:
                logging.error(r.json()["error"]["message"])
                next_page = False
                continue

            response_data = r.json()
            for tweet in response_data["results"]:
                csv_tweet = tweet2csv(tweet, category_name=category, category_terms=self.orig_query)
                if csv_tweet is not None:
                    csv_writer.writerow(csv_tweet)
                    count += 1

            next_page = response_data["next"] if "next" in response_data else False
        csv_file.close()

        return count


class JobManager(object):
    def __init__(self, pt):
        self.pt = pt

    def create(self, from_date, to_date, title, rules):
        """
        Create a new job definition
        :param from_date: Start timestamp
        :param to_date: End timestamp
        :param title: Title for the job (file name)
        :param rules: Powertrack rules. Each rule will be ANDed with geo-enabled filter. Only one rule is currently supported (others ignored if more than one)
        :return:
        """
        terms = " OR ".join(['\"%s\"' % rule for rule in rules])
        query = "({value}) (has:geo OR has:profile_geo)".format(value=terms)
        print "RULE", query

        data = {
            "publisher": "twitter",
            "fromDate": from_date.strftime("%Y%m%d%H%M"),
            "toDate": to_date.strftime("%Y%m%d%H%M"),
            "query": query,
            "maxResults": 500
        }

        return Job(self.pt, title=title, job_data=data, orig_query="elecciones")
