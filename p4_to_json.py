"""
This program converts P4 output to JSON.

Based on this work:
http://www.endlesslycurious.com/2011/03/28/processing-perforce-command-output-with-python/
"""

import marshal, json, subprocess
 
def Run( cmd ):
  """Run supplied perforce command and return output as a list of dictionaries."""
  results = []
  cmd = "p4 -G %s" % cmd
  # Run the Perforce command using -G option to get results as Python marshalled dictionary objects.
  process = subprocess.Popen( cmd, stdout=subprocess.PIPE, shell=True )
  # Harvest stdout output until end of file exception is thrown.
  try:
    while 1:
      output = marshal.load( process.stdout )
      results.append( output )
  except EOFError:
    pass
  finally:
    process.stdout.close()
  return results
 
if __name__=="__main__":
  import csv, datetime, sys

   # Perforce command to run, fetch the latest submitted changelists.
  cmd = sys.argv[1]
 
  # Get results.
  results = Run( cmd )
  #print "Command: 'p4 -G %s' - %d" % (cmd,len(results))

  print json.dumps(results, indent=4)
