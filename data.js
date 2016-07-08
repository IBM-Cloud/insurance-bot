module.exports = {

    createRecord: function (identifier, name) {

        data = {
            name: name,
            id: identifier,
            birthday: '',
            gender: 'N/A',
            address: '',
            created_at: '2014-05-12 - 03:15:10',
            policy_renewal_date: '2017-05-11',
            logins: [],
            policies: [

            {
                policy: 'health',
                createdat: '01/01/2016',
                policyrenewal: '01/01/2017',
                categories: [
                  {
                        category: 'Vision',
                        description: 'Reading Glasses comes under general policy',

                        symbol: '',
                        coverage:
                        [
                          {
                                item: 'Eye Test',
                                limit: 100,
                                available: 0,
                                window: 2,
                                instances: 1,
                                begin: '2016-01-01',
                                percentage: 80,
                                claims:
                                [
                                  {
                                    date: '2016-05-17',
                                    amount: 80
                                  }
                                ]
                            },
                            {
                                item: 'Eye Wear',
                                limit: 300,
                                available: 30,
                                window: 2,
                                instances: 'limit',
                                begin: '2016-01-01',
                                percentage: 80,
                                claims:
                                [
                                  {
                                    date: '2016-05-17',
                                    amount: 337.50
                                  }
                                ]
                            }
                          ]
                    },

                    {
                        category: 'Dental',
                        description: 'Members can access orthodontic benefits as well as an enhanced range of dental benefits.',
                        symbol: '',
                        coverage: [{
                            item: 'Cleaning',
                            limit: 'unlimited',
                            window: 1,
                            instances: 6,
                            begin: '2016-01-01',
                            percentage: 90,
                            claims: []
            }, {
                            item: 'Orthodontics',
                            limit: 3000,
                            window: 'lifetime',
                            instances: 'limit',
                            begin: '2016-01-01',
                            percentage: 80,
                            claims: []
            }, {
                            item: 'X-Ray',
                            limit: 'unlimited',
                            window: 1,
                            instances: 1,
                            begin: '2016-01-01',
                            percentage: 90,
                            claims: []
                        }]
                    }]
            }]
        }
        return data;
    }
}
